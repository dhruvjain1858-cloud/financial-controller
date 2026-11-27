import type { SupabaseClient } from "@supabase/supabase-js";
import { DELETE_ORDER, UPSERT_ORDER, type SyncPlan } from "./diff";
import type { RemoteSnapshot, TableName } from "./mapping";

// Isolate this app's schema from legacy tables already present in the user's
// Supabase project. Those legacy tables are intentionally not modified.
const DB_TABLE: Record<TableName, string> = {
  transactions: "fc_transactions",
  cards: "fc_cards",
  loans: "fc_loans",
  budgets: "fc_budgets",
  goals: "fc_goals",
};

/**
 * Thin adapter between the sync plan and Supabase (PostgREST).
 * Access control is enforced by Row Level Security in the database, not here:
 * the client never sends user_id; Postgres fills it from auth.uid().
 */
export async function loadRemote(db: SupabaseClient, authId: string): Promise<RemoteSnapshot> {
  const [profile, transactions, cards, loans, budgets, goals] = await Promise.all([
    db.from("fc_profiles").select("*").eq("auth_id", authId).maybeSingle(),
    db.from(DB_TABLE.transactions).select("*").order("date", { ascending: false }),
    db.from(DB_TABLE.cards).select("*"),
    db.from(DB_TABLE.loans).select("*"),
    db.from(DB_TABLE.budgets).select("*"),
    db.from(DB_TABLE.goals).select("*"),
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
    const { error } = await db.from("fc_profiles").upsert([plan.profile], {
      onConflict: "auth_id",
      defaultToNull: false,
    });
    if (error) throw new Error(`Saving profile failed: ${error.message}`);
  }
  for (const table of UPSERT_ORDER) {
    const rows = plan.upserts[table];
    if (!rows?.length) continue;
    const { error } = await db.from(DB_TABLE[table]).upsert(rows as object[], {
      onConflict: "user_id,id",
      defaultToNull: false,
    });
    if (error) throw new Error(`Saving ${table} failed: ${error.message}`);
  }
  for (const table of DELETE_ORDER as TableName[]) {
    const ids = plan.deletes[table];
    if (!ids?.length) continue;
    const { error } = await db.from(DB_TABLE[table]).delete().in("id", ids);
    if (error) throw new Error(`Deleting ${table} failed: ${error.message}`);
  }
}
