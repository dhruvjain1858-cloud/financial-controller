-- Minimal local stand-in for the parts of Supabase the migration depends on,
-- so the schema and RLS policies can be tested on plain PostgreSQL.
-- auth.uid() is defined the same way Supabase defines it: from the JWT "sub" claim.
create schema if not exists auth;
create table if not exists auth.users (id uuid primary key);
create or replace function auth.uid() returns uuid language sql stable as $$
  select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid
$$;
do $$ begin
  if not exists (select 1 from pg_roles where rolname = 'authenticated') then
    create role authenticated nologin;
  end if;
end $$;
grant usage on schema public, auth to authenticated;
grant execute on function auth.uid() to authenticated;
