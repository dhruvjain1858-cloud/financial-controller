import { initialState, type FinancialState, type Transaction } from "@/types";
import { localISODate } from "@/utils/helpers";

/**
 * A realistic month of sample data, dated relative to `today` so the dashboard,
 * weekly trend and alerts all have something to show. Marked isDemo: never
 * uploaded to an account (see FinancialContext.connectRemote).
 */
export function buildDemoState(today: Date = new Date()): FinancialState {
  const day = (offset: number) => {
    const d = new Date(today);
    d.setDate(d.getDate() - offset);
    return localISODate(d);
  };
  const monthStart = localISODate(new Date(today.getFullYear(), today.getMonth(), 1));
  let n = 0;
  const tx = (t: Omit<Transaction, "id">): Transaction => ({ ...t, id: `demo-${++n}` });

  const transactions: Transaction[] = [
    tx({ type: "income", amount: 65000, category: "Salary", date: monthStart, description: "salary" }),
    tx({ type: "expense", amount: 18000, category: "Housing", date: monthStart, description: "rent" }),
    tx({ type: "expense", amount: 450, category: "Food", date: day(0), description: "swiggy dinner" }),
    tx({ type: "expense", amount: 220, category: "Transport", date: day(1), description: "metro recharge" }),
    tx({ type: "expense", amount: 1899, category: "Shopping", date: day(2), description: "amazon headphones", creditCardId: "demo-card" }),
    tx({ type: "expense", amount: 640, category: "Food", date: day(3), description: "zomato lunch" }),
    tx({ type: "expense", amount: 1200, category: "Utilities", date: day(4), description: "electricity bill" }),
    tx({ type: "expense", amount: 499, category: "Entertainment", date: day(5), description: "netflix" }),
    tx({ type: "expense", amount: 3200, category: "Food", date: day(6), description: "groceries", creditCardId: "demo-card" }),
  ];

  return {
    ...initialState,
    user: { name: "Demo User", monthlyIncome: 65000, isDemo: true },
    balance: 38000,
    onboarded: true,
    transactions,
    cards: [{ id: "demo-card", name: "Demo Card", network: "Visa", limit: 60000, used: 21500 }],
    loans: [{ id: "demo-loan", name: "Two-wheeler loan", totalAmount: 90000, remaining: 52000, emi: 4300, interest: 10.5, monthsRemaining: 13 }],
    budgets: [
      { id: "demo-b1", category: "Food", limit: 6000 },
      { id: "demo-b2", category: "Shopping", limit: 4000 },
    ],
    goals: [{ id: "demo-g1", title: "Emergency fund", targetAmount: 100000, savedAmount: 42000, deadline: localISODate(new Date(today.getFullYear() + 1, 2, 31)) }],
  };
}
