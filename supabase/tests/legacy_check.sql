-- Runs AFTER the migration (and after a deliberate second run that must fail):
-- the legacy tables' rows and columns must be exactly as they were.
\set ON_ERROR_STOP 1
\set QUIET 1
\pset tuples_only on
set client_min_messages = notice;
reset role;

do $$
declare rows_now text; cols_now text;
begin
  select md5(string_agg(t, '|' order by t)) into rows_now from (
    select 'users:'        || row_to_json(u)::text as t from public.users u
    union all select 'income:'       || row_to_json(i)::text from public.income i
    union all select 'transactions:' || row_to_json(x)::text from public.transactions x
    union all select 'cards:'        || row_to_json(c)::text from public.cards c
    union all select 'budgets:'      || row_to_json(b)::text from public.budgets b
    union all select 'goals:'        || row_to_json(g)::text from public.goals g
  ) s;
  select md5(string_agg(table_name || '.' || column_name || ':' || data_type, '|' order by table_name, ordinal_position))
    into cols_now
  from information_schema.columns
  where table_schema = 'public' and table_name in ('users','income','transactions','cards','budgets','goals');

  if rows_now is distinct from (select digest from public._legacy_snapshot where kind = 'rows') then
    raise exception 'FAIL: legacy table rows changed';
  end if;
  if cols_now is distinct from (select digest from public._legacy_snapshot where kind = 'columns') then
    raise exception 'FAIL: legacy table columns changed';
  end if;
  if exists (select 1 from pg_class c join pg_namespace n on n.oid = c.relnamespace
             where n.nspname = 'public' and c.relname in ('users','transactions','cards','budgets','goals')
               and c.relrowsecurity) then
    raise exception 'FAIL: migration changed RLS settings on a legacy table';
  end if;
  raise notice 'PASS legacy tables, rows and columns untouched';
end $$;

-- The deliberate second run must have left exactly one set of fc_* tables.
do $$ begin
  if (select count(*) from pg_class c join pg_namespace n on n.oid = c.relnamespace
      where n.nspname = 'public' and c.relkind = 'r' and c.relname like 'fc\_%') <> 6 then
    raise exception 'FAIL: unexpected fc_* tables after the rerun attempt';
  end if;
  raise notice 'PASS rerunning the migration fails closed and changes nothing';
end $$;
\echo 'ALL LEGACY-SAFETY TESTS PASSED'
