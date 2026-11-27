/**
 * Integration test: sync plans produced by planSync() applied to the REAL schema
 * (supabase/migrations) on PostgreSQL, as an `authenticated` user with RLS on.
 *
 * It replays each plan with the same semantics the Supabase adapter asks PostgREST
 * for (INSERT ... ON CONFLICT (user_id,id) DO UPDATE with user_id defaulted from
 * auth.uid(); DELETE ... WHERE id = ANY). It verifies row shapes against the CHECK
 * constraints, the parent-before-child write order, and per-user isolation.
 * It does NOT exercise supabase-js/PostgREST itself.
 *
 * Skipped unless DATABASE_URL points at a database prepared by scripts/test-db.sh.
 */
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { Client } from "pg";
import { planSync, UPSERT_ORDER, DELETE_ORDER, type SyncPlan } from "@/lib/sync/diff";
import { stateFromRemote, type RemoteSnapshot } from "@/lib/sync/mapping";
import { financialReducer } from "@/context/FinancialContext";
import { initialState } from "@/types";
import { makeState } from "../fixtures";

const url = process.env.DATABASE_URL;
const ALICE = "aaaaaaaa-0000-0000-0000-000000000001";
const BOB = "bbbbbbbb-0000-0000-0000-000000000002";

async function as(db: Client, uid: string) {
  await db.query("reset role");
  await db.query("select set_config('request.jwt.claim.sub', $1, false)", [uid]);
  await db.query("set role authenticated");
}

async function apply(db: Client, plan: SyncPlan) {
  if (plan.profile) {
    const cols = Object.keys(plan.profile);
    const vals = cols.map((c) => {
      const v = (plan.profile as unknown as Record<string, unknown>)[c];
      return c === "custom_mappings" ? JSON.stringify(v) : v;
    });
    await db.query(
      `insert into public.users (${cols.join(",")}) values (${cols.map((_, i) => `$${i + 1}`).join(",")})
       on conflict (auth_id) do update set ${cols.map((c) => `${c} = excluded.${c}`).join(",")}`,
      vals
    );
  }
  for (const table of UPSERT_ORDER) {
    for (const row of (plan.upserts[table] ?? []) as unknown as Record<string, unknown>[]) {
      const cols = Object.keys(row);
      await db.query(
        `insert into public.${table} (${cols.join(",")}) values (${cols.map((_, i) => `$${i + 1}`).join(",")})
         on conflict (user_id, id) do update set ${cols.map((c) => `${c} = excluded.${c}`).join(",")}`,
        cols.map((c) => row[c])
      );
    }
  }
  for (const table of DELETE_ORDER) {
    const ids = plan.deletes[table];
    if (ids?.length) await db.query(`delete from public.${table} where id = any($1)`, [ids]);
  }
}

async function load(db: Client, uid: string): Promise<RemoteSnapshot> {
  const q = async (sql: string) => (await db.query(sql)).rows;
  const dates = (rows: Record<string, unknown>[], key: string) =>
    rows.map((r) => ({ ...r, [key]: r[key] ? (r[key] as string) : null }));
  return {
    profile: (await db.query("select * from public.users where auth_id = $1", [uid])).rows[0] ?? null,
    transactions: dates(await q("select id,type,amount,category,to_char(date,'YYYY-MM-DD') as date,description,credit_card_id from public.transactions"), "date") as never,
    cards: (await q("select id,name,network,card_limit,used from public.cards")) as never,
    loans: (await q("select id,name,total_amount,remaining,emi,interest,months_remaining from public.loans")) as never,
    budgets: (await q("select id,category,budget_limit from public.budgets")) as never,
    goals: (await q("select id,title,target_amount,saved_amount,to_char(deadline,'YYYY-MM-DD') as deadline from public.goals")) as never,
  };
}

describe.skipIf(!url)("sync plans against the real schema with RLS", () => {
  const db = new Client({ connectionString: url });

  beforeAll(async () => {
    await db.connect();
    await db.query("reset role");
    // start from a clean slate so the suite is repeatable (cascades to all finance tables)
    await db.query("delete from auth.users where id = any($1)", [[ALICE, BOB]]);
    await db.query("insert into auth.users values ($1), ($2)", [ALICE, BOB]);
  });
  afterAll(async () => {
    await db.query("reset role");
    await db.end();
  });

  it("uploads a full local state and reads it back identically", async () => {
    await as(db, ALICE);
    const local = makeState();
    await apply(db, planSync({ ...initialState, categories: [] }, local));
    const back = stateFromRemote(await load(db, ALICE));
    expect(back.balance).toBe(local.balance);
    expect(back.cards).toEqual(local.cards);
    expect(back.loans).toEqual(local.loans);
    expect(back.budgets).toEqual(local.budgets);
    expect(back.goals).toEqual(local.goals);
    expect([...back.transactions].sort((a, b) => a.id.localeCompare(b.id)))
      .toEqual([...local.transactions].sort((a, b) => a.id.localeCompare(b.id)));
  });

  it("applies incremental reducer changes: card expense, edit, delete card", async () => {
    await as(db, ALICE);
    const s0 = stateFromRemote(await load(db, ALICE));
    const s1 = financialReducer(s0, { type: "ADD_TRANSACTION", payload: { id: "t10", type: "expense", amount: 700, category: "Shopping", date: "2026-11-24", creditCardId: "c1" } });
    await apply(db, planSync(s0, s1));
    const s2 = financialReducer(s1, { type: "DELETE_CARD", payload: "c1" });
    await apply(db, planSync(s1, s2)); // reducer and DB both detach t10 from the deleted card
    expect(s2.transactions.find((t) => t.id === "t10")?.creditCardId).toBeUndefined();
    const s3 = financialReducer(s2, { type: "UPDATE_TRANSACTION", payload: { id: "t10", type: "expense", amount: 750, category: "Shopping", date: "2026-11-24" } });
    await apply(db, planSync(s2, s3)); // would have failed the FK check before the reducer fix
    const back = stateFromRemote(await load(db, ALICE));
    expect(back.cards).toHaveLength(0);
    expect(back.transactions.find((t) => t.id === "t10")?.creditCardId).toBeUndefined();
    expect(back.transactions).toHaveLength(5);
  });

  it("keeps each user's data private", async () => {
    await as(db, ALICE);
    const aliceBefore = stateFromRemote(await load(db, ALICE));
    await as(db, BOB);
    const bobView = await load(db, BOB);
    expect(bobView.transactions).toHaveLength(0);
    expect(bobView.profile).toBeNull();
    // Bob's own upload with the SAME client-side ids does not collide with Alice's rows
    await apply(db, planSync({ ...initialState, categories: [] }, makeState({ balance: 1 })));
    expect(stateFromRemote(await load(db, BOB)).balance).toBe(1);
    await as(db, ALICE);
    expect(stateFromRemote(await load(db, ALICE))).toEqual(aliceBefore);
  });
});
