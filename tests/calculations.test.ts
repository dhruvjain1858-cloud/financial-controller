import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  generateAlerts,
  generateInsights,
  getBalanceAfterEmi,
  getBudgetUsage,
  getHealthScore,
  getMonthlyExpenses,
  getMonthlyIncome,
  getRealBalance,
  getRiskLevel,
  assessAffordability,
  getSafeSpendingLimit,
  getSpendingByCategory,
  getTotalEmi,
  getWeeklyTrend,
  safePct,
} from "@/utils/calculations";
import { makeState } from "./fixtures";

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date(2026, 10, 25, 12, 0, 0)); // 25 Nov 2026, local noon
});
afterEach(() => vi.useRealTimers());

describe("real balance and EMI projection", () => {
  it("subtracts outstanding card dues from the bank balance", () => {
    expect(getRealBalance(makeState())).toBe(40000 - 30000);
  });

  it("sums EMIs across loans", () => {
    expect(getTotalEmi(makeState())).toBe(6500);
  });

  it("projects the balance after this month's EMIs", () => {
    expect(getBalanceAfterEmi(makeState())).toBe(10000 - 6500);
  });

  it("stops counting an EMI once this month's instalment is paid", () => {
    const s = makeState();
    s.loans[0] = { ...s.loans[0], lastPaidMonth: "2026-11" };
    expect(getTotalEmi(s)).toBe(2500);
    s.loans[1] = { ...s.loans[1], remaining: 0, monthsRemaining: 0 };
    expect(getTotalEmi(s)).toBe(0);
    expect(generateAlerts(s).some((a) => a.id === "alert-emi")).toBe(false);
  });

  it("reports a shortfall as a negative number", () => {
    expect(getBalanceAfterEmi(makeState({ balance: 32000 }))).toBe(2000 - 6500);
  });

  it("states the post-EMI projection in insights", () => {
    const insights = generateInsights(makeState());
    expect(insights.some((i) => i.includes("projected real balance") && i.includes("3,500"))).toBe(true);
    const short = generateInsights(makeState({ balance: 32000 }));
    expect(short.some((i) => i.includes("shortfall") && i.includes("4,500"))).toBe(true);
  });
});

describe("safe spending limit", () => {
  it("is 30% of what is left after card dues and EMIs", () => {
    expect(getSafeSpendingLimit(makeState())).toBeCloseTo(3500 * 0.3);
  });
  it("is never negative", () => {
    expect(getSafeSpendingLimit(makeState({ balance: 0 }))).toBe(0);
  });
  it("uses 20% when no income is set", () => {
    expect(getSafeSpendingLimit(makeState({ user: { name: "", monthlyIncome: 0 } }))).toBeCloseTo(3500 * 0.2);
  });
});

describe("can I afford this?", () => {
  // fixture: real balance 10,000, EMIs due 6,500 -> 3,500 free; safe limit 1,050
  it("is safe within the safe spending limit", () => {
    expect(assessAffordability(makeState(), 1000)).toMatchObject({ status: "safe", afterBalance: 2500 });
  });
  it("warns when affordable but above the safe limit", () => {
    expect(assessAffordability(makeState(), 3000)?.status).toBe("warning");
  });
  it("refuses when EMIs due could no longer be paid", () => {
    // 5,000 fits in the real balance (10,000) but not after 6,500 of EMIs
    expect(assessAffordability(makeState(), 5000)).toMatchObject({ status: "danger", afterBalance: -1500 });
  });
  it("reports card utilisation if paid by card, and ignores invalid amounts", () => {
    expect(assessAffordability(makeState(), 10000)?.utilizationIfCard).toBe(40);
    expect(assessAffordability(makeState({ cards: [] }), 10)?.utilizationIfCard).toBeNull();
    expect(assessAffordability(makeState(), 0)).toBeNull();
    expect(assessAffordability(makeState(), Number.NaN)).toBeNull();
  });
});

describe("monthly aggregates", () => {
  it("counts only the current month", () => {
    const s = makeState();
    expect(getMonthlyExpenses(s.transactions)).toBe(4200); // excludes October's 900
    expect(getMonthlyIncome(s.transactions)).toBe(50000);
    expect(getBudgetUsage(s.transactions, "Food")).toBe(4200);
  });

  it("groups spending by category, largest first", () => {
    const rows = getSpendingByCategory(makeState().transactions);
    expect(rows.map((r) => [r.name, r.value])).toEqual([["Food", 4200]]);
  });

  it("returns a 7-day trend ending today", () => {
    const trend = getWeeklyTrend(makeState().transactions);
    expect(trend).toHaveLength(7);
    expect(trend.reduce((s, d) => s + d.spending, 0)).toBe(4200); // 20th and 21st fall inside 19-25 Nov
  });
});

describe("risk and health score", () => {
  it("bands utilisation at 30% and 70%", () => {
    expect(getRiskLevel(29, 100)).toBe("low");
    expect(getRiskLevel(30, 100)).toBe("medium");
    expect(getRiskLevel(70, 100)).toBe("medium");
    expect(getRiskLevel(71, 100)).toBe("high");
  });

  it("does not divide by zero for a zero limit", () => {
    expect(getRiskLevel(0, 0)).toBe("low");
    expect(getRiskLevel(10, 0)).toBe("high");
    expect(safePct(5, 0)).toBe(0);
  });

  it("keeps the health score within 0-100 and finite", () => {
    for (const s of [
      makeState(),
      makeState({ balance: -1e9 }),
      makeState({ cards: [{ id: "z", name: "Z", network: "", limit: 0, used: 0 }] }),
      makeState({ user: { name: "", monthlyIncome: 0 }, cards: [], transactions: [] }),
    ]) {
      const score = getHealthScore(s);
      expect(Number.isFinite(score)).toBe(true);
      expect(score).toBeGreaterThanOrEqual(0);
      expect(score).toBeLessThanOrEqual(100);
    }
  });
});

describe("alerts", () => {
  const ids = (s = makeState()) => generateAlerts(s).map((a) => a.id);

  it("raises the EMI reminder with the total due", () => {
    const emi = generateAlerts(makeState()).find((a) => a.id === "alert-emi");
    expect(emi?.description).toContain("6,500");
    expect(emi?.description).toContain("still due");
  });

  it("warns at 80% of a budget and flags 100%", () => {
    expect(ids()).toContain("alert-budget-warn-b1"); // 4200 / 5000 = 84%
    expect(ids(makeState({ budgets: [{ id: "b1", category: "Food", limit: 4000 }] }))).toContain("alert-budget-exceeded-b1");
  });

  it("warns above 50% card utilisation and flags above 70%", () => {
    expect(ids(makeState({ cards: [{ id: "c1", name: "A", network: "", limit: 100, used: 60 }] }))).toContain("alert-card-warn-c1");
    expect(ids(makeState({ cards: [{ id: "c1", name: "A", network: "", limit: 100, used: 75 }] }))).toContain("alert-card-c1");
  });

  it("flags a real balance strictly below 20% of income", () => {
    expect(ids()).not.toContain("alert-low-balance"); // real balance 10,000 = exactly 20% of 50,000
    expect(ids(makeState({ balance: 39000 }))).toContain("alert-low-balance"); // 9,000 < 10,000
  });

  it("flags spending above income this month", () => {
    const s = makeState();
    s.transactions.push({ id: "t9", type: "expense", amount: 60000, category: "Shopping", date: "2026-11-22" });
    expect(ids(s)).toContain("alert-overspend");
  });

  it("celebrates a goal at 90-99%", () => {
    expect(ids()).toContain("alert-goal-g1"); // 76000 / 80000 = 95%
  });

  it("never produces NaN or Infinity text for zero limits", () => {
    const s = makeState({
      cards: [{ id: "c0", name: "Zero", network: "", limit: 0, used: 0 }],
      budgets: [{ id: "b0", category: "Food", limit: 0 }],
      goals: [{ id: "g0", title: "G", targetAmount: 0, savedAmount: 0, deadline: "" }],
    });
    const text = JSON.stringify([generateAlerts(s), generateInsights(s)]);
    expect(text).not.toMatch(/NaN|Infinity/);
  });
});
