import type { SupabaseClient } from "@supabase/supabase-js";
import { DELETE_ORDER, UPSERT_ORDER, type SyncPlan } from "./diff";
import type { RemoteSnapshot, TableName } from "./mapping";

/**
 * Thin adapter between the sync plan and Supabase (PostgREST).
 * Access control is enforced by Row Level Security in the database, not here:
 * the client never sends user_id; Postgres fills it from auth.uid().
 */
export async function loadRemote(db: SupabaseClient, authId: string): Promise<RemoteSnapshot> {
  const [profile, transactions, cards, loans, budgets, goals] = await Promise.all([
    db.from("users").select("*").eq("auth_id", authId).maybeSingle(),
    db.from("transactions").select("*").order("date", { ascending: false }),
    db.from("cards").select("*"),
    db.from("loans").select("*"),
    db.from("budgets").select("*"),
    db.from("goals").select("*"),
  ]);
  for (const r of [profile, transactions, cards, loans, budgets, goals]) {
    if (r.error) throw new Error(`Supabase load failed: ${r.error.message}`);
  }
  return {
    profile: profile.data,
    transactions: transactions.data ?? [],
    cards: cards.data ?? [],
    loans: loans.data ?? [],
    budgets: budgets.data ?? [],
    goals: goals.data ?? [],
  };
}

export async function applyPlan(db: SupabaseClient, plan: SyncPlan): Promise<void> {
  if (plan.profile) {
    const { error } = await db.from("users").upsert([plan.profile], { onConflict: "auth_id", defaultToNull: false });
    if (error) throw new Error(`Saving profile failed: ${error.message}`);
  }
  for (const table of UPSERT_ORDER) {
    const rows = plan.upserts[table];
    if (!rows?.length) continue;
    const { error } = await db.from(table).upsert(rows as object[], { onConflict: "user_id,id", defaultToNull: false });
    if (error) throw new Error(`Saving ${table} failed: ${error.message}`);
  }
  for (const table of DELETE_ORDER as TableName[]) {
    const ids = plan.deletes[table];
    if (!ids?.length) continue;
    const { error } = await db.from(table).delete().in("id", ids);
    if (error) throw new Error(`Deleting ${table} failed: ${error.message}`);
  }
}
