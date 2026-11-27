import type { FinancialState } from "@/types";
import { profileFromState, toRow, type ProfileRow, type TableName, type TableRows } from "./mapping";

/**
 * The set of database writes needed to move the remote copy from `prev` to `next`.
 * Pure function: the reducer stays the single source of truth for the business
 * rules (balance and card-usage adjustments), and this only works out which rows
 * changed. Upserts are ordered parents-first (cards before transactions) and
 * deletes children-first, so foreign keys never fail mid-sync.
 */
export interface SyncPlan {
  profile: ProfileRow | null;
  upserts: { [K in TableName]?: TableRows[K][] };
  deletes: { [K in TableName]?: string[] };
}

export const UPSERT_ORDER: TableName[] = ["cards", "transactions", "loans", "budgets", "goals"];
export const DELETE_ORDER: TableName[] = ["transactions", "cards", "loans", "budgets", "goals"];

type Keyed = { id: string };

function diffList<T extends Keyed, R>(prev: T[], next: T[], map: (x: T) => R) {
  const before = new Map(prev.map((x) => [x.id, JSON.stringify(map(x))]));
  const after = new Set(next.map((x) => x.id));
  const upserts = next.filter((x) => before.get(x.id) !== JSON.stringify(map(x))).map(map);
  const deletes = prev.filter((x) => !after.has(x.id)).map((x) => x.id);
  return { upserts, deletes };
}

export function planSync(prev: FinancialState, next: FinancialState): SyncPlan {
  const plan: SyncPlan = { profile: null, upserts: {}, deletes: {} };

  const p0 = JSON.stringify(profileFromState(prev));
  const p1 = profileFromState(next);
  if (p0 !== JSON.stringify(p1)) plan.profile = p1;

  const lists: { [K in TableName]: ReturnType<typeof diffList> } = {
    transactions: diffList(prev.transactions, next.transactions, toRow.transactions),
    cards: diffList(prev.cards, next.cards, toRow.cards),
    loans: diffList(prev.loans, next.loans, toRow.loans),
    budgets: diffList(prev.budgets, next.budgets, toRow.budgets),
    goals: diffList(prev.goals, next.goals, toRow.goals),
  };
  for (const t of UPSERT_ORDER) {
    if (lists[t].upserts.length) (plan.upserts as Record<string, unknown[]>)[t] = lists[t].upserts;
    if (lists[t].deletes.length) plan.deletes[t] = lists[t].deletes;
  }
  return plan;
}

export function isEmptyPlan(p: SyncPlan): boolean {
  return !p.profile && Object.keys(p.upserts).length === 0 && Object.keys(p.deletes).length === 0;
}
