-- Stand-in for the pre-existing legacy tables in the real Supabase project.
-- Their columns deliberately differ from the app's so any accidental write,
-- rename or ALTER by the migration would be caught. Created BEFORE the migration.
set client_min_messages = warning;
create table public.users        (id serial primary key, name text, email text);
create table public.income       (id serial primary key, user_id int, amount numeric, source text);
create table public.transactions (id serial primary key, user_id int, amount numeric, note text);
create table public.cards        (id serial primary key, user_id int, bank text);
create table public.budgets      (id serial primary key, user_id int, monthly numeric);
create table public.goals        (id serial primary key, user_id int, target numeric);

insert into public.users (name, email) values ('Legacy Lee', 'lee@example.com');
insert into public.income (user_id, amount, source) values (1, 42000, 'salary');
insert into public.transactions (user_id, amount, note) values (1, 199.5, 'legacy row');
insert into public.cards (user_id, bank) values (1, 'SBI');
insert into public.budgets (user_id, monthly) values (1, 5000);
insert into public.goals (user_id, target) values (1, 90000);

-- Snapshot of the legacy tables' rows and column definitions, compared after the migration.
create table public._legacy_snapshot as
select 'rows' as kind, md5(string_agg(t, '|' order by t)) as digest from (
  select 'users:'        || row_to_json(u)::text as t from public.users u
  union all select 'income:'       || row_to_json(i)::text from public.income i
  union all select 'transactions:' || row_to_json(x)::text from public.transactions x
  union all select 'cards:'        || row_to_json(c)::text from public.cards c
  union all select 'budgets:'      || row_to_json(b)::text from public.budgets b
  union all select 'goals:'        || row_to_json(g)::text from public.goals g
) s
union all
select 'columns', md5(string_agg(table_name || '.' || column_name || ':' || data_type, '|' order by table_name, ordinal_position))
from information_schema.columns
where table_schema = 'public' and table_name in ('users','income','transactions','cards','budgets','goals');
