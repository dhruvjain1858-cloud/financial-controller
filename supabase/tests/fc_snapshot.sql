-- Snapshot of the six fc_* tables (rows, columns, RLS flags, policies, grants),
-- taken after the first migration and the RLS tests, immediately BEFORE the
-- deliberate second migration attempt. legacy_check.sql compares against it.
\set ON_ERROR_STOP 1
set client_min_messages = warning;
reset role;
create table public._fc_snapshot as
select * from public._describe_tables(array['fc_budgets','fc_cards','fc_goals','fc_loans','fc_profiles','fc_transactions']);
