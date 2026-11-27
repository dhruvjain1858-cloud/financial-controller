import { initialState, type FinancialState } from "@/types";

/** A realistic state for a user in November 2026. */
export function makeState(overrides: Partial<FinancialState> = {}): FinancialState {
  return {
    ...initialState,
    user: { name: "Test", monthlyIncome: 50000 },
    balance: 40000,
    onboarded: true,
    cards: [{ id: "c1", name: "HDFC", network: "Visa", limit: 100000, used: 30000 }],
    loans: [
      { id: "l1", name: "Bike", totalAmount: 80000, remaining: 40000, emi: 4000, interest: 9.5, monthsRemaining: 10 },
      { id: "l2", name: "Phone", totalAmount: 30000, remaining: 12000, emi: 2500, interest: 0, monthsRemaining: 5 },
    ],
    transactions: [
      { id: "t1", type: "income", amount: 50000, category: "Salary", date: "2026-11-01", description: "salary" },
      { id: "t2", type: "expense", amount: 1200, category: "Food", date: "2026-11-20", description: "swiggy dinner" },
      { id: "t3", type: "expense", amount: 3000, category: "Food", date: "2026-11-21" },
      { id: "t4", type: "expense", amount: 900, category: "Transport", date: "2026-10-30" }, // last month
    ],
    budgets: [{ id: "b1", category: "Food", limit: 5000 }],
    goals: [{ id: "g1", title: "Laptop", targetAmount: 80000, savedAmount: 76000, deadline: "2027-03-01" }],
    ...overrides,
  };
}
