-- RLS and constraint tests. Run with: npm run test:db  (needs DATABASE_URL to a scratch database)
-- Each check raises an exception on failure, so psql -v ON_ERROR_STOP=1 exits non-zero.
\set ON_ERROR_STOP 1
\set QUIET 1
\pset tuples_only on
set client_min_messages = notice;

insert into auth.users values
  ('11111111-1111-1111-1111-111111111111'),
  ('22222222-2222-2222-2222-222222222222');

-- helper: become a signed-in user
create or replace function pg_temp.login(u uuid) returns void language plpgsql as $$
begin
  perform set_config('request.jwt.claim.sub', u::text, false);
  execute 'set role authenticated';
end $$;

-- ── Alice writes her own data (user_id comes from auth.uid() default) ──
select pg_temp.login('11111111-1111-1111-1111-111111111111');
insert into public.users (email, name, monthly_income, balance) values ('alice@example.com','Alice', 50000, 20000);
insert into public.cards (id, name, network, card_limit, used) values ('c1','HDFC','Visa',100000,30000);
insert into public.transactions (id, type, amount, category, date, description, credit_card_id)
  values ('t1','expense',500,'Food','2026-11-01','swiggy dinner','c1'),
         ('t2','income',50000,'Salary','2026-11-01','salary',null);
insert into public.loans (id, name, total_amount, remaining, emi, interest, months_remaining)
  values ('l1','Bike loan',80000,40000,4000,9.5,10);
insert into public.budgets (id, category, budget_limit) values ('b1','Food',6000);
insert into public.goals (id, title, target_amount, saved_amount, deadline) values ('g1','Laptop',80000,10000,'2027-03-01');

do $$ begin
  if (select count(*) from public.transactions) <> 2 then raise exception 'FAIL: Alice should see her 2 transactions'; end if;
  raise notice 'PASS owner can insert and read own rows';
end $$;

-- ── Bob cannot see, change or delete Alice's rows ──
reset role;
select pg_temp.login('22222222-2222-2222-2222-222222222222');
do $$
declare n int;
begin
  select count(*) into n from public.transactions; if n <> 0 then raise exception 'FAIL: Bob sees % of Alice''s transactions', n; end if;
  select count(*) into n from public.users;        if n <> 0 then raise exception 'FAIL: Bob sees Alice''s profile'; end if;
  select count(*) into n from public.cards;        if n <> 0 then raise exception 'FAIL: Bob sees Alice''s cards'; end if;
  update public.transactions set amount = 1 where id = 't1';
  get diagnostics n = row_count; if n <> 0 then raise exception 'FAIL: Bob updated Alice''s transaction'; end if;
  delete from public.goals where id = 'g1';
  get diagnostics n = row_count; if n <> 0 then raise exception 'FAIL: Bob deleted Alice''s goal'; end if;
  raise notice 'PASS other users cannot read, update or delete';
end $$;

-- ── Bob cannot insert a row claiming to be Alice ──
do $$ begin
  begin
    insert into public.transactions (user_id, id, type, amount, category, date)
      values ('11111111-1111-1111-1111-111111111111','evil','expense',1,'Food','2026-11-02');
    raise exception 'FAIL: Bob inserted a row as Alice';
  exception when insufficient_privilege then
    raise notice 'PASS cannot insert rows for another user (WITH CHECK)';
  end;
end $$;

-- ── Bob cannot attach his expense to Alice's card (composite FK) ──
do $$ begin
  begin
    insert into public.transactions (id, type, amount, category, date, credit_card_id)
      values ('t9','expense',100,'Food','2026-11-02','c1');
    raise exception 'FAIL: Bob referenced Alice''s card';
  exception when foreign_key_violation then
    raise notice 'PASS cannot reference another user''s card';
  end;
end $$;

-- ── Signed-out (no JWT) sees nothing ──
reset role;
select set_config('request.jwt.claim.sub', '', false);
set role authenticated;
do $$ begin
  if (select count(*) from public.transactions) <> 0 then raise exception 'FAIL: anonymous sees rows'; end if;
  raise notice 'PASS no auth.uid() means no rows';
end $$;

-- ── Data validation constraints ──
reset role;
select pg_temp.login('11111111-1111-1111-1111-111111111111');
do $$
declare bad text[] := array[
  $q$insert into public.transactions (id,type,amount,category,date) values ('x1','expense',0,'Food','2026-11-01')$q$,
  $q$insert into public.transactions (id,type,amount,category,date) values ('x2','refund',10,'Food','2026-11-01')$q$,
  $q$insert into public.transactions (id,type,amount,category,date,credit_card_id) values ('x3','income',10,'Salary','2026-11-01','c1')$q$,
  $q$insert into public.cards (id,name,card_limit) values ('x4','Zero',0)$q$,
  $q$insert into public.loans (id,name,total_amount,remaining,emi,months_remaining) values ('x5','L',100,200,10,1)$q$,
  $q$insert into public.budgets (id,category,budget_limit) values ('x6','Food',100)$q$,
  $q$insert into public.goals (id,title,target_amount) values ('x7','G',-5)$q$
];
q text;
begin
  foreach q in array bad loop
    begin
      execute q;
      raise exception 'FAIL: accepted invalid row: %', q;
    exception when check_violation or unique_violation then null;
    end;
  end loop;
  raise notice 'PASS % invalid rows rejected by constraints', array_length(bad,1);
end $$;

-- ── Deleting a card detaches its transactions instead of deleting them ──
delete from public.cards where id = 'c1';
do $$ begin
  if (select credit_card_id from public.transactions where id = 't1') is not null then
    raise exception 'FAIL: transaction still points at deleted card'; end if;
  if (select count(*) from public.transactions) <> 2 then raise exception 'FAIL: transactions lost with card'; end if;
  raise notice 'PASS card delete keeps transactions and clears the link';
end $$;

reset role;
\echo 'ALL RLS TESTS PASSED'
