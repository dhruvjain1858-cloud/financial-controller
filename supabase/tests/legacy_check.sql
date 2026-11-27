-- Runs AFTER the migration and after a deliberate second run that must fail.
-- Compares the database with the snapshots from legacy_fixture.sql and fc_snapshot.sql.
\set ON_ERROR_STOP 1
\set QUIET 1
\pset tuples_only on
set client_min_messages = notice;
reset role;

-- 1-5. Every legacy table: rows, columns, RLS, FORCE RLS, policies (and grants) unchanged.
do $$
declare diff text;
begin
  select string_agg(format('%s.%s: before [%s] now [%s]', coalesce(b.table_name, n.table_name), coalesce(b.aspect, n.aspect),
                           coalesce(b.detail, 'missing'), coalesce(n.detail, 'missing')), E'\n'
                    order by coalesce(b.table_name, n.table_name), coalesce(b.aspect, n.aspect))
    into diff
  from public._legacy_snapshot b
  full join public._describe_tables(array['budgets','cards','goals','income','transactions','users']) n
    using (table_name, aspect)
  where b.detail is distinct from n.detail;
  if diff is not null then raise exception E'FAIL: legacy tables changed:\n%', diff; end if;
  raise notice 'PASS legacy rows, columns, policies and grants unchanged (budgets, cards, goals, income, transactions, users)';
end $$;

-- Explicit state checks (also implied by the snapshot comparison above).
do $$
declare bad text;
begin
  select string_agg(c.relname, ', ' order by c.relname) into bad
  from pg_class c join pg_namespace s on s.oid = c.relnamespace
  where s.nspname = 'public' and c.relname in ('users','income','transactions','cards','budgets','goals')
    and not c.relrowsecurity;
  if bad is not null then raise exception 'FAIL: RLS disabled on legacy table(s): %', bad; end if;

  select string_agg(c.relname, ', ' order by c.relname) into bad
  from pg_class c join pg_namespace s on s.oid = c.relnamespace
  where s.nspname = 'public' and c.relname in ('users','income','transactions','cards','budgets','goals')
    and c.relforcerowsecurity;
  if bad is not null then raise exception 'FAIL: FORCE RLS enabled on legacy table(s): %', bad; end if;

  if (select count(*) from pg_class c join pg_namespace s on s.oid = c.relnamespace
      where s.nspname = 'public' and c.relname in ('users','income','transactions','cards','budgets','goals')) <> 6 then
    raise exception 'FAIL: a legacy table is missing';
  end if;

  select string_agg(tablename || '.' || policyname, ', ' order by tablename, policyname) into bad
  from pg_policies where schemaname = 'public' and tablename in ('users','income','transactions','cards','budgets','goals');
  if bad is not null then raise exception 'FAIL: policies exist on legacy tables: %', bad; end if;

  raise notice 'PASS all 6 legacy tables still have RLS enabled, FORCE RLS disabled and zero policies';
end $$;

-- 6. Exactly one set of the six fc_* tables after the second migration attempt.
do $$
declare names text;
begin
  select string_agg(c.relname, ',' order by c.relname) into names
  from pg_class c join pg_namespace s on s.oid = c.relnamespace
  where s.nspname = 'public' and c.relkind in ('r', 'p') and c.relname like 'fc\_%';
  if names is distinct from 'fc_budgets,fc_cards,fc_goals,fc_loans,fc_profiles,fc_transactions' then
    raise exception 'FAIL: expected exactly the six fc_* tables, found: %', coalesce(names, 'none');
  end if;
  raise notice 'PASS exactly the six fc_* tables exist after the second migration attempt';
end $$;

-- 7. The failed second run did not alter the fc_* tables either.
do $$
declare diff text;
begin
  select string_agg(format('%s.%s: before [%s] now [%s]', coalesce(b.table_name, n.table_name), coalesce(b.aspect, n.aspect),
                           coalesce(b.detail, 'missing'), coalesce(n.detail, 'missing')), E'\n'
                    order by coalesce(b.table_name, n.table_name), coalesce(b.aspect, n.aspect))
    into diff
  from public._fc_snapshot b
  full join public._describe_tables(array['fc_budgets','fc_cards','fc_goals','fc_loans','fc_profiles','fc_transactions']) n
    using (table_name, aspect)
  where b.detail is distinct from n.detail;
  if diff is not null then raise exception E'FAIL: second migration attempt changed fc_* tables:\n%', diff; end if;
  raise notice 'PASS the failed second migration attempt left the fc_* tables unchanged';
end $$;
\echo 'ALL LEGACY-SAFETY TESTS PASSED'
