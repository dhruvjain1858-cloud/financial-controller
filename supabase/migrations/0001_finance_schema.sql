-- Financial Controller schema (isolated from pre-existing legacy public tables).
--
-- This migration intentionally creates fc_* tables rather than modifying the
-- existing public.users/cards/transactions/budgets/goals/income tables. The
-- existing tables have a different schema and may contain legacy user data.
-- No legacy rows are deleted, renamed, altered, or automatically imported.
--
-- Run once against the Supabase project after reviewing the migration. It is
-- transactional: any error rolls the entire migration back.

begin;

do $$
declare
  existing_tables text[];
begin
  select array_agg(c.relname order by c.relname)
    into existing_tables
  from pg_class c
  join pg_namespace n on n.oid = c.relnamespace
  where n.nspname = 'public'
    and c.relkind in ('r', 'p')
    and c.relname = any (array[
      'fc_profiles', 'fc_cards', 'fc_transactions',
      'fc_loans', 'fc_budgets', 'fc_goals'
    ]);

  if existing_tables is not null then
    raise exception
      'Financial Controller tables already exist: %. Inspect them and prepare an upgrade migration; do not rerun this initial migration.',
      array_to_string(existing_tables, ', ');
  end if;
end $$;

-- Profile data belongs to the authenticated Supabase user. The legacy
-- public.users table is deliberately left untouched.
create table public.fc_profiles (
  auth_id         uuid primary key default auth.uid()
                  references auth.users (id) on delete cascade,
  email           text,
  name            text not null default '' check (char_length(name) <= 100),
  monthly_income  numeric(14,2) not null default 0 check (monthly_income >= 0),
  balance         numeric(14,2) not null default 0,
  onboarded       boolean not null default false,
  theme           text not null default 'dark' check (theme in ('dark', 'light')),
  categories      text[] not null default '{}',
  custom_mappings jsonb not null default '{}'::jsonb,
  updated_at      timestamptz not null default now()
);

create table public.fc_cards (
  user_id    uuid not null default auth.uid()
             references auth.users (id) on delete cascade,
  id         text not null,
  name       text not null check (char_length(name) between 1 and 60),
  network    text not null default '',
  card_limit numeric(14,2) not null check (card_limit > 0),
  used       numeric(14,2) not null default 0 check (used >= 0),
  primary key (user_id, id)
);

create table public.fc_transactions (
  user_id        uuid not null default auth.uid()
                 references auth.users (id) on delete cascade,
  id             text not null,
  type           text not null check (type in ('income', 'expense')),
  amount         numeric(14,2) not null check (amount > 0),
  category       text not null check (char_length(category) between 1 and 40),
  date           date not null,
  description    text check (char_length(description) <= 200),
  credit_card_id text,
  created_at     timestamptz not null default now(),
  primary key (user_id, id),
  foreign key (user_id, credit_card_id)
    references public.fc_cards (user_id, id)
    on delete set null (credit_card_id),
  check (credit_card_id is null or type = 'expense')
);
create index fc_transactions_user_date_idx
  on public.fc_transactions (user_id, date desc);

create table public.fc_loans (
  user_id          uuid not null default auth.uid()
                     references auth.users (id) on delete cascade,
  id               text not null,
  name             text not null check (char_length(name) between 1 and 60),
  total_amount     numeric(14,2) not null check (total_amount > 0),
  remaining        numeric(14,2) not null check (remaining >= 0),
  emi              numeric(14,2) not null check (emi > 0),
  interest         numeric(6,3) not null default 0
                     check (interest >= 0 and interest <= 100),
  months_remaining integer not null check (months_remaining >= 0),
  last_paid_month  text check (last_paid_month ~ '^\d{4}-\d{2}$'),
  primary key (user_id, id),
  check (remaining <= total_amount)
);

create table public.fc_budgets (
  user_id      uuid not null default auth.uid()
                 references auth.users (id) on delete cascade,
  id           text not null,
  category     text not null check (char_length(category) between 1 and 40),
  budget_limit numeric(14,2) not null check (budget_limit > 0),
  primary key (user_id, id),
  unique (user_id, category)
);

create table public.fc_goals (
  user_id       uuid not null default auth.uid()
                  references auth.users (id) on delete cascade,
  id            text not null,
  title         text not null check (char_length(title) between 1 and 80),
  target_amount numeric(14,2) not null check (target_amount > 0),
  saved_amount  numeric(14,2) not null default 0 check (saved_amount >= 0),
  deadline      date,
  primary key (user_id, id)
);

-- RLS is enabled and forced on every Financial Controller table. Policies
-- use the authenticated JWT subject; the client never supplies user_id.
alter table public.fc_profiles enable row level security;
alter table public.fc_profiles force row level security;
alter table public.fc_cards enable row level security;
alter table public.fc_cards force row level security;
alter table public.fc_transactions enable row level security;
alter table public.fc_transactions force row level security;
alter table public.fc_loans enable row level security;
alter table public.fc_loans force row level security;
alter table public.fc_budgets enable row level security;
alter table public.fc_budgets force row level security;
alter table public.fc_goals enable row level security;
alter table public.fc_goals force row level security;

create policy fc_profiles_owner on public.fc_profiles
  for all to authenticated
  using (auth_id = (select auth.uid()))
  with check (auth_id = (select auth.uid()));

create policy fc_cards_owner on public.fc_cards
  for all to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

create policy fc_transactions_owner on public.fc_transactions
  for all to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

create policy fc_loans_owner on public.fc_loans
  for all to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

create policy fc_budgets_owner on public.fc_budgets
  for all to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

create policy fc_goals_owner on public.fc_goals
  for all to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

-- Do not grant table access to anon or PUBLIC. Authenticated users get CRUD
-- access subject to RLS; service_role retains its expected administrative use.
revoke all on table
  public.fc_profiles, public.fc_cards, public.fc_transactions,
  public.fc_loans, public.fc_budgets, public.fc_goals
  from public, anon, authenticated, service_role;

grant select, insert, update, delete on table
  public.fc_profiles, public.fc_cards, public.fc_transactions,
  public.fc_loans, public.fc_budgets, public.fc_goals
  to authenticated;

grant all on table
  public.fc_profiles, public.fc_cards, public.fc_transactions,
  public.fc_loans, public.fc_budgets, public.fc_goals
  to service_role;

commit;
