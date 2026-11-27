import type { Budget, CreditCard, FinancialState, Goal, Loan, Transaction } from "@/types";
import { initialState } from "@/types";

// Row shapes exactly as defined in supabase/migrations/0001_finance_schema.sql.
// user_id / auth_id are filled by the database from auth.uid(), never by the client.

export interface ProfileRow {
  email?: string | null;
  name: string;
  monthly_income: number;
  balance: number;
  onboarded: boolean;
  theme: "dark" | "light";
  categories: string[];
  custom_mappings: Record<string, string>;
}
export interface TransactionRow {
  id: string; type: "income" | "expense"; amount: number; category: string;
  date: string; description: string | null; credit_card_id: string | null;
}
export interface CardRow { id: string; name: string; network: string; card_limit: number; used: number }
export interface LoanRow {
  id: string; name: string; total_amount: number; remaining: number; emi: number;
  interest: number; months_remaining: number; last_paid_month: string | null;
}
export interface BudgetRow { id: string; category: string; budget_limit: number }
export interface GoalRow { id: string; title: string; target_amount: number; saved_amount: number; deadline: string | null }

export type TableName = "transactions" | "cards" | "loans" | "budgets" | "goals";
export interface TableRows {
  transactions: TransactionRow; cards: CardRow; loans: LoanRow; budgets: BudgetRow; goals: GoalRow;
}

// Postgres numeric columns come back from PostgREST as strings; coerce explicitly.
const num = (v: unknown): number => (typeof v === "number" ? v : Number(v));

export const toRow = {
  transactions: (t: Transaction): TransactionRow => ({
    id: t.id, type: t.type, amount: t.amount, category: t.category, date: t.date,
    description: t.description ?? null, credit_card_id: t.creditCardId ?? null,
  }),
  cards: (c: CreditCard): CardRow => ({ id: c.id, name: c.name, network: c.network, card_limit: c.limit, used: c.used }),
  loans: (l: Loan): LoanRow => ({
    id: l.id, name: l.name, total_amount: l.totalAmount, remaining: l.remaining, emi: l.emi,
    interest: l.interest, months_remaining: l.monthsRemaining, last_paid_month: l.lastPaidMonth ?? null,
  }),
  budgets: (b: Budget): BudgetRow => ({ id: b.id, category: b.category, budget_limit: b.limit }),
  goals: (g: Goal): GoalRow => ({
    id: g.id, title: g.title, target_amount: g.targetAmount, saved_amount: g.savedAmount, deadline: g.deadline || null,
  }),
};

export const fromRow = {
  transactions: (r: TransactionRow): Transaction => ({
    id: r.id, type: r.type, amount: num(r.amount), category: r.category, date: r.date,
    ...(r.description ? { description: r.description } : {}),
    ...(r.credit_card_id ? { creditCardId: r.credit_card_id } : {}),
  }),
  cards: (r: CardRow): CreditCard => ({ id: r.id, name: r.name, network: r.network, limit: num(r.card_limit), used: num(r.used) }),
  loans: (r: LoanRow): Loan => ({
    id: r.id, name: r.name, totalAmount: num(r.total_amount), remaining: num(r.remaining), emi: num(r.emi),
    interest: num(r.interest), monthsRemaining: num(r.months_remaining),
    ...(r.last_paid_month ? { lastPaidMonth: r.last_paid_month } : {}),
  }),
  budgets: (r: BudgetRow): Budget => ({ id: r.id, category: r.category, limit: num(r.budget_limit) }),
  goals: (r: GoalRow): Goal => ({
    id: r.id, title: r.title, targetAmount: num(r.target_amount), savedAmount: num(r.saved_amount), deadline: r.deadline ?? "",
  }),
};

export function profileFromState(s: FinancialState, email?: string | null): ProfileRow {
  return {
    ...(email !== undefined ? { email } : {}),
    name: s.user.name,
    monthly_income: s.user.monthlyIncome,
    balance: s.balance,
    onboarded: s.onboarded,
    theme: s.theme,
    categories: s.categories,
    custom_mappings: s.customMappings,
  };
}

export interface RemoteSnapshot {
  profile: ProfileRow | null;
  transactions: TransactionRow[]; cards: CardRow[]; loans: LoanRow[]; budgets: BudgetRow[]; goals: GoalRow[];
}

export function stateFromRemote(r: RemoteSnapshot): FinancialState {
  const p = r.profile;
  return {
    ...initialState,
    user: { name: p?.name ?? "", monthlyIncome: num(p?.monthly_income ?? 0), isDemo: false },
    balance: num(p?.balance ?? 0),
    onboarded: p?.onboarded ?? false,
    theme: p?.theme ?? "dark",
    categories: p?.categories?.length ? p.categories : [...initialState.categories],
    customMappings: p?.custom_mappings ?? {},
    transactions: r.transactions.map(fromRow.transactions).sort((a, b) => b.date.localeCompare(a.date)),
    cards: r.cards.map(fromRow.cards),
    loans: r.loans.map(fromRow.loans),
    budgets: r.budgets.map(fromRow.budgets),
    goals: r.goals.map(fromRow.goals),
  };
}

export function isRemoteEmpty(r: RemoteSnapshot): boolean {
  return !r.profile?.onboarded && r.transactions.length + r.cards.length + r.loans.length + r.budgets.length + r.goals.length === 0;
}
