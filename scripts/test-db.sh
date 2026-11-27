#!/usr/bin/env bash
# Applies the migration to a SCRATCH Postgres database and runs the RLS and
# legacy-safety tests.
# Usage: DATABASE_URL=postgres://postgres@localhost:5432/fc_test npm run test:db
# The database is dropped and recreated -- never point this at real data.
set -euo pipefail
: "${DATABASE_URL:?Set DATABASE_URL to a scratch database}"
DB_PATH="${DATABASE_URL%%\?*}"; DB_QUERY="${DATABASE_URL#"$DB_PATH"}"; DB_NAME="${DB_PATH##*/}"
ADMIN_URL="${DB_PATH%/*}/postgres${DB_QUERY}"
psql "$ADMIN_URL" -q -v ON_ERROR_STOP=1 -c "drop database if exists \"$DB_NAME\"" -c "create database \"$DB_NAME\""
psql "$DATABASE_URL" -q -v ON_ERROR_STOP=1 -f supabase/tests/supabase_shim.sql
psql "$DATABASE_URL" -q -v ON_ERROR_STOP=1 -f supabase/tests/legacy_fixture.sql
psql "$DATABASE_URL" -q -v ON_ERROR_STOP=1 -f supabase/migrations/0001_finance_schema.sql
psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f supabase/tests/rls_test.sql

# A second run must refuse (the tables exist) and roll back without changing anything.
if out=$(psql "$DATABASE_URL" -q -v ON_ERROR_STOP=1 -f supabase/migrations/0001_finance_schema.sql 2>&1); then
  echo "FAIL: re-running the migration succeeded; it must fail closed" >&2
  exit 1
fi
grep -q "Financial Controller tables already exist" <<<"$out" || { echo "FAIL: unexpected rerun error: $out" >&2; exit 1; }

psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f supabase/tests/legacy_check.sql
