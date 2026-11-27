-- Financial Controller: persistent per-user finance data with Row Level Security.
--
-- Every table carries user_id, defaulted from auth.uid(), and every policy
-- restricts reads AND writes to rows whose user_id equals the caller's auth.uid().
-- Client-generated text ids are kept (the app creates ids offline), so the
-- primary key is (user_id, id).

-- ── Profile / account-level state ─────────────────────────────────────────
create table if not exists public.users (
  auth_id         uuid primary key default auth.uid() references auth.users (id) on delete cascade,
  email           text,
  name            text not null default '' check (char_length(name) <= 100),
  monthly_income  numeric(14,2) not null default 0 check (monthly_income >= 0),
  balance         numeric(14,2) not null default 0,
  onboarded       boolean not null default false,
  theme           text not null default 'dark' check (theme in ('dark','light')),
  categories      text[] not null default '{}',
  custom_mappings jsonb not null default '{}'::jsonb,
  updated_at      timestamptz not null default now()
);

-- ── Credit cards ──────────────────────────────────────────────────────────
create table if not exists public.cards (
  user_id    uuid not null default auth.uid() references auth.users (id) on delete cascade,
  id         text not null,
  name       text not null check (char_length(name) between 1 and 60),
  network    text not null default '',
  card_limit numeric(14,2) not null check (card_limit > 0),
  used       numeric(14,2) not null default 0 check (used >= 0),
  primary key (user_id, id)
);

-- ── Transactions ──────────────────────────────────────────────────────────
create table if not exists public.transactions (
  user_id        uuid not null default auth.uid() references auth.users (id) on delete cascade,
  id             text not null,
  type           text not null check (type in ('income','expense')),
  amount         numeric(14,2) not null check (amount > 0),
  category       text not null check (char_length(category) between 1 and 40),
  date           date not null,
  description    text check (char_length(description) <= 200),
  credit_card_id text,
  created_at     timestamptz not null default now(),
  primary key (user_id, id),
  -- a card expense must point at one of the SAME user's cards
  foreign key (user_id, credit_card_id) references public.cards (user_id, id) on delete set null (credit_card_id),
  check (credit_card_id is null or type = 'expense')
);
create index if not exists transactions_user_date_idx on public.transactions (user_id, date desc);

-- ── Loans ─────────────────────────────────────────────────────────────────
create table if not exists public.loans (
  user_id          uuid not null default auth.uid() references auth.users (id) on delete cascade,
  id               text not null,
  name             text not null check (char_length(name) between 1 and 60),
  total_amount     numeric(14,2) not null check (total_amount > 0),
  remaining        numeric(14,2) not null check (remaining >= 0),
  emi              numeric(14,2) not null check (emi > 0),
  interest         numeric(6,3) not null default 0 check (interest >= 0 and interest <= 100),
  months_remaining integer not null check (months_remaining >= 0),
  last_paid_month  text check (last_paid_month ~ '^\d{4}-\d{2}$'),
  primary key (user_id, id),
  check (remaining <= total_amount)
);

-- ── Budgets ───────────────────────────────────────────────────────────────
create table if not exists public.budgets (
  user_id      uuid not null default auth.uid() references auth.users (id) on delete cascade,
  id           text not null,
  category     text not null check (char_length(category) between 1 and 40),
  budget_limit numeric(14,2) not null check (budget_limit > 0),
  primary key (user_id, id),
  unique (user_id, category)
);

-- ── Savings goals ─────────────────────────────────────────────────────────
create table if not exists public.goals (
  user_id       uuid not null default auth.uid() references auth.users (id) on delete cascade,
  id            text not null,
  title         text not null check (char_length(title) between 1 and 80),
  target_amount numeric(14,2) not null check (target_amount > 0),
  saved_amount  numeric(14,2) not null default 0 check (saved_amount >= 0),
  deadline      date,
  primary key (user_id, id)
);

-- ── Row Level Security ────────────────────────────────────────────────────
alter table public.users        enable row level security;
alter table public.cards        enable row level security;
alter table public.transactions enable row level security;
alter table public.loans        enable row level security;
alter table public.budgets      enable row level security;
alter table public.goals        enable row level security;

drop policy if exists users_owner on public.users;
create policy users_owner on public.users
  for all to authenticated
  using (auth_id = auth.uid()) with check (auth_id = auth.uid());

do $$
declare t text;
begin
  foreach t in array array['cards','transactions','loans','budgets','goals'] loop
    execute format('drop policy if exists %1$s_owner on public.%1$s', t);
    execute format(
      'create policy %1$s_owner on public.%1$s for all to authenticated
         using (user_id = auth.uid()) with check (user_id = auth.uid())', t);
  end loop;
end $$;

grant select, insert, update, delete on
  public.users, public.cards, public.transactions, public.loans, public.budgets, public.goals
  to authenticated;
