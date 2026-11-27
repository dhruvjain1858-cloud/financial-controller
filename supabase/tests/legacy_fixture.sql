-- Stand-in for the pre-existing legacy tables in the real Supabase project,
-- created BEFORE the migration. Their columns deliberately differ from the app's
-- so any accidental write, rename or ALTER by the migration is caught.
--
-- Security baseline reproduced from the real project's diagnostics:
--   RLS enabled on all six tables, FORCE RLS disabled, zero policies.
\set ON_ERROR_STOP 1
set client_min_messages = warning;

create table public.users        (id serial primary key, name text, email text);
create table public.income       (id serial primary key, user_id int, amount numeric, source text);
create table public.transactions (id serial primary key, user_id int, amount numeric, note text);
create table public.cards        (id serial primary key, user_id int, bank text);
create table public.budgets      (id serial primary key, user_id int, monthly numeric);
create table public.goals        (id serial primary key, user_id int, target numeric);

alter table public.users        enable row level security;
alter table public.income       enable row level security;
alter table public.transactions enable row level security;
alter table public.cards        enable row level security;
alter table public.budgets      enable row level security;
alter table public.goals        enable row level security;
-- deliberately NO "force row level security" and NO policies

insert into public.users (name, email) values ('Legacy Lee', 'lee@example.com');
insert into public.income (user_id, amount, source) values (1, 42000, 'salary');
insert into public.transactions (user_id, amount, note) values (1, 199.5, 'legacy row');
insert into public.cards (user_id, bank) values (1, 'SBI');
insert into public.budgets (user_id, monthly) values (1, 5000);
insert into public.goals (user_id, target) values (1, 90000);

-- ── Deterministic description of a set of public tables ─────────────────────
-- One row per (table, aspect). Every aggregate is explicitly ordered, so the same
-- database state always produces the same text.
create function public._describe_tables(names text[])
returns table (table_name text, aspect text, detail text)
language plpgsql as $$
declare t text; v text;
begin
  foreach t in array names loop
    -- rows: count + digest of every row, in a stable order
    execute format(
      'select count(*)::text || '':'' || coalesce(md5(string_agg(row_to_json(x)::text, ''|'' order by row_to_json(x)::text)), ''empty'') from public.%I x', t)
      into v;
    table_name := t; aspect := 'rows'; detail := v; return next;

    -- columns: position, name, exact type, NOT NULL, default (dropped columns excluded)
    select string_agg(format('%s:%s:%s:%s:%s', a.attnum, a.attname, format_type(a.atttypid, a.atttypmod),
                             a.attnotnull::text, coalesce(pg_get_expr(d.adbin, d.adrelid), '-')), '|' order by a.attnum)
      into v
    from pg_attribute a
    left join pg_attrdef d on d.adrelid = a.attrelid and d.adnum = a.attnum
    where a.attrelid = format('public.%I', t)::regclass and a.attnum > 0 and not a.attisdropped;
    table_name := t; aspect := 'columns'; detail := v; return next;

    -- RLS flags
    select format('rls=%s force=%s', c.relrowsecurity::text, c.relforcerowsecurity::text) into v
    from pg_class c where c.oid = format('public.%I', t)::regclass;
    table_name := t; aspect := 'rls'; detail := v; return next;

    -- policies: count + full definition of each, ordered by name
    select count(*)::text || ':' || coalesce(string_agg(format('%s/%s/%s/%s/%s/%s', p.policyname, p.permissive::text, p.cmd,
             array_to_string(p.roles, ','), coalesce(p.qual, '-'), coalesce(p.with_check, '-')), '|' order by p.policyname), 'none')
      into v
    from pg_policies p where p.schemaname = 'public' and p.tablename = t;
    table_name := t; aspect := 'policies'; detail := v; return next;

    -- grants: every (grantee, privilege) pair, ordered
    select coalesce(string_agg(format('%s:%s', coalesce(r.rolname, 'PUBLIC'), x.privilege_type),
                               '|' order by coalesce(r.rolname, 'PUBLIC'), x.privilege_type), 'none')
      into v
    from pg_class c
    cross join lateral aclexplode(coalesce(c.relacl, acldefault('r', c.relowner))) x
    left join pg_roles r on r.oid = x.grantee
    where c.oid = format('public.%I', t)::regclass;
    table_name := t; aspect := 'grants'; detail := v; return next;
  end loop;
end $$;

create table public._legacy_snapshot as
select * from public._describe_tables(array['budgets','cards','goals','income','transactions','users']);

-- The baseline itself must match the real project: RLS on, FORCE off, no policies.
do $$
declare bad text;
begin
  select string_agg(table_name || ' ' || detail, ', ' order by table_name) into bad
  from public._legacy_snapshot where aspect = 'rls' and detail <> 'rls=true force=false';
  if bad is not null then raise exception 'FIXTURE: expected rls=true force=false, got: %', bad; end if;

  select string_agg(table_name || ' ' || detail, ', ' order by table_name) into bad
  from public._legacy_snapshot where aspect = 'policies' and detail <> '0:none';
  if bad is not null then raise exception 'FIXTURE: expected zero policies, got: %', bad; end if;

  if (select count(distinct table_name) from public._legacy_snapshot) <> 6 then
    raise exception 'FIXTURE: expected 6 legacy tables in the snapshot';
  end if;
end $$;
