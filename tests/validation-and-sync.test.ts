import { describe, expect, it } from "vitest";
import { sanitizeState, validateLoan, validateTransaction, validateCard } from "@/lib/validation";
import { planSync, isEmptyPlan, UPSERT_ORDER, DELETE_ORDER } from "@/lib/sync/diff";
import { fromRow, stateFromRemote, toRow, isRemoteEmpty } from "@/lib/sync/mapping";
import { makeState } from "./fixtures";

describe("validation", () => {
  const tx = { id: "a", type: "expense", amount: 100, category: "Food", date: "2026-11-01" };

  it("accepts a valid transaction", () => {
    expect(validateTransaction(tx).ok).toBe(true);
  });

  it("rejects zero/negative amounts, bad dates and card-charged income", () => {
    expect(validateTransaction({ ...tx, amount: 0 }).ok).toBe(false);
    expect(validateTransaction({ ...tx, amount: -5 }).ok).toBe(false);
    expect(validateTransaction({ ...tx, amount: Number.NaN }).ok).toBe(false);
    expect(validateTransaction({ ...tx, date: "01/11/2026" }).ok).toBe(false);
    expect(validateTransaction({ ...tx, type: "income", creditCardId: "c1" }).ok).toBe(false);
  });

  it("rejects a zero card limit and loans whose remaining exceeds the total", () => {
    expect(validateCard({ id: "c", name: "A", network: "", limit: 0, used: 0 }).ok).toBe(false);
    const r = validateLoan({ id: "l", name: "L", totalAmount: 100, remaining: 200, emi: 10, interest: 0, monthsRemaining: 1 });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error).toMatch(/remaining/);
  });

  it("drops corrupt saved rows and dangling card links instead of crashing", () => {
    const { state, dropped } = sanitizeState({
      balance: 100,
      transactions: [
        { id: "ok", type: "expense", amount: 5, category: "Food", date: "2026-11-01", creditCardId: "gone" },
        { id: "bad", type: "expense", amount: "five", category: "Food", date: "2026-11-01" },
      ],
      cards: [{ id: "c", name: "", network: "", limit: 10, used: 0 }],
    });
    expect(dropped).toBe(2);
    expect(state.transactions).toHaveLength(1);
    expect(state.transactions[0].creditCardId).toBeUndefined();
    expect(state.cards).toHaveLength(0);
  });

  it("returns a safe default for garbage input", () => {
    expect(sanitizeState("nonsense").state.transactions).toEqual([]);
  });
});

describe("sync planning", () => {
  it("produces no writes when nothing changed", () => {
    const s = makeState();
    expect(isEmptyPlan(planSync(s, s))).toBe(true);
  });

  it("sends only added, changed and deleted rows", () => {
    const prev = makeState();
    const next = {
      ...prev,
      transactions: [
        { ...prev.transactions[1], amount: 1300 }, // changed
        { id: "new", type: "expense" as const, amount: 99, category: "Food", date: "2026-11-25" }, // added
        prev.transactions[0], prev.transactions[3], // t3 deleted
      ],
    };
    const plan = planSync(prev, next);
    expect(plan.upserts.transactions?.map((r) => r.id).sort()).toEqual(["new", "t2"]);
    expect(plan.deletes.transactions).toEqual(["t3"]);
    expect(plan.upserts.cards).toBeUndefined();
    expect(plan.profile).toBeNull();
  });

  it("includes the profile when balance or settings change", () => {
    const prev = makeState();
    expect(planSync(prev, { ...prev, balance: 1 }).profile?.balance).toBe(1);
    expect(planSync(prev, { ...prev, theme: "light" }).profile?.theme).toBe("light");
  });

  it("orders writes so foreign keys hold", () => {
    expect(UPSERT_ORDER.indexOf("cards")).toBeLessThan(UPSERT_ORDER.indexOf("transactions"));
    expect(DELETE_ORDER.indexOf("transactions")).toBeLessThan(DELETE_ORDER.indexOf("cards"));
  });
});

describe("row mapping", () => {
  it("round-trips every entity through its database row", () => {
    const s = makeState();
    for (const t of s.transactions) expect(fromRow.transactions(toRow.transactions(t))).toEqual(t);
    for (const c of s.cards) expect(fromRow.cards(toRow.cards(c))).toEqual(c);
    for (const l of s.loans) expect(fromRow.loans(toRow.loans(l))).toEqual(l);
    for (const b of s.budgets) expect(fromRow.budgets(toRow.budgets(b))).toEqual(b);
    for (const g of s.goals) expect(fromRow.goals(toRow.goals(g))).toEqual(g);
  });

  it("converts Postgres numeric strings back to numbers", () => {
    const state = stateFromRemote({
      profile: { name: "A", monthly_income: "50000.00" as unknown as number, balance: "1200.50" as unknown as number, onboarded: true, theme: "dark", categories: [], custom_mappings: {} },
      transactions: [{ id: "t", type: "expense", amount: "99.90" as unknown as number, category: "Food", date: "2026-11-01", description: null, credit_card_id: null }],
      cards: [], loans: [], budgets: [], goals: [],
    });
    expect(state.balance).toBe(1200.5);
    expect(state.user.monthlyIncome).toBe(50000);
    expect(state.transactions[0].amount).toBeCloseTo(99.9);
    expect(state.categories.length).toBeGreaterThan(0); // empty list falls back to defaults
  });

  it("treats an account with no rows and no onboarding as empty", () => {
    expect(isRemoteEmpty({ profile: null, transactions: [], cards: [], loans: [], budgets: [], goals: [] })).toBe(true);
  });
});
