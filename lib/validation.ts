import { z } from "zod";
import type { Budget, CreditCard, FinancialState, Goal, Loan, Transaction } from "@/types";
import { initialState } from "@/types";

// Mirrors the CHECK constraints in supabase/migrations/0001_finance_schema.sql,
// so invalid input is rejected in the UI before it ever reaches the database.

const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Use YYYY-MM-DD").refine(
  (s) => !Number.isNaN(Date.parse(s)),
  "Invalid date"
);
// numeric(14,2) in Postgres holds values below 10^12; larger input would fail at sync time.
export const MAX_AMOUNT = 999_999_999_999.99;
const money = z.number().finite().max(MAX_AMOUNT, "Amount is too large").min(-MAX_AMOUNT, "Amount is too large");
const positive = money.positive("Must be greater than 0");
const nonNegative = money.nonnegative("Cannot be negative");

export const transactionSchema = z
  .object({
    id: z.string().min(1),
    type: z.enum(["income", "expense"]),
    amount: positive,
    category: z.string().trim().min(1).max(40),
    date: isoDate,
    description: z.string().max(200).optional(),
    creditCardId: z.string().min(1).optional(),
  })
  .refine((t) => !t.creditCardId || t.type === "expense", {
    message: "Only expenses can be charged to a card",
    path: ["creditCardId"],
  });

export const cardSchema = z.object({
  id: z.string().min(1),
  name: z.string().trim().min(1).max(60),
  network: z.string().max(30),
  limit: positive,
  used: nonNegative,
});

const loanShape = z.object({
  id: z.string().min(1),
  name: z.string().trim().min(1).max(60),
  totalAmount: positive,
  remaining: nonNegative,
  emi: positive,
  interest: money.min(0).max(100),
  monthsRemaining: z.number().int().nonnegative(),
  lastPaidMonth: z.string().regex(/^\d{4}-\d{2}$/).optional(),
});

/** Rules for loans already saved: never drop a user's existing data for a newer, stricter rule. */
const storedLoanSchema = loanShape.refine((l) => l.remaining <= l.totalAmount, {
  message: "Remaining cannot exceed the total amount",
  path: ["remaining"],
});

/** Rules for new or edited loans. */
export const loanSchema = storedLoanSchema.refine((l) => l.remaining === 0 || l.emi > (l.remaining * l.interest) / 1200, {
  message: "EMI must be more than the monthly interest, or the loan never reduces",
  path: ["emi"],
});

export const budgetSchema = z.object({
  id: z.string().min(1),
  category: z.string().trim().min(1).max(40),
  limit: positive,
});

export const goalSchema = z.object({
  id: z.string().min(1),
  title: z.string().trim().min(1).max(80),
  targetAmount: positive,
  savedAmount: nonNegative,
  deadline: z.union([isoDate, z.literal("")]),
});

export type ValidationResult<T> = { ok: true; value: T } | { ok: false; error: string };

function check<T>(schema: z.ZodType<T>, value: unknown): ValidationResult<T> {
  const r = schema.safeParse(value);
  if (r.success) return { ok: true, value: r.data };
  const issue = r.error.issues[0];
  return { ok: false, error: `${issue.path.join(".") || "value"}: ${issue.message}` };
}

export const validateTransaction = (v: unknown) => check<Transaction>(transactionSchema as z.ZodType<Transaction>, v);
export const validateCard = (v: unknown) => check<CreditCard>(cardSchema, v);
export const validateLoan = (v: unknown) => check<Loan>(loanSchema as z.ZodType<Loan>, v);
export const validateBudget = (v: unknown) => check<Budget>(budgetSchema, v);
export const validateGoal = (v: unknown) => check<Goal>(goalSchema, v);

/**
 * Cleans state loaded from localStorage or the database: drops rows that fail
 * validation instead of letting one corrupt row break every calculation.
 * Returns the cleaned state and how many rows were dropped.
 */
export function sanitizeState(raw: unknown): { state: FinancialState; dropped: number } {
  const input = (raw && typeof raw === "object" ? raw : {}) as Partial<FinancialState>;
  let dropped = 0;
  const keep = <T>(items: unknown, validate: (v: unknown) => ValidationResult<T>): T[] => {
    if (!Array.isArray(items)) return [];
    const out: T[] = [];
    for (const item of items) {
      const r = validate(item);
      if (r.ok) out.push(r.value);
      else dropped++;
    }
    return out;
  };

  const cards = keep(input.cards, validateCard);
  const cardIds = new Set(cards.map((c) => c.id));
  const transactions = keep(input.transactions, validateTransaction).map((t) =>
    t.creditCardId && !cardIds.has(t.creditCardId) ? { ...t, creditCardId: undefined } : t
  );

  const state: FinancialState = {
    ...initialState,
    user: {
      name: typeof input.user?.name === "string" ? input.user.name : "",
      monthlyIncome:
        typeof input.user?.monthlyIncome === "number" && input.user.monthlyIncome >= 0
          ? input.user.monthlyIncome
          : 0,
      isDemo: input.user?.isDemo,
    },
    balance: typeof input.balance === "number" && Number.isFinite(input.balance) ? input.balance : 0,
    transactions,
    cards,
    loans: keep(input.loans, (v) => check<Loan>(storedLoanSchema as z.ZodType<Loan>, v)),
    budgets: keep(input.budgets, validateBudget),
    goals: keep(input.goals, validateGoal),
    categories:
      Array.isArray(input.categories) && input.categories.every((c) => typeof c === "string")
        ? input.categories
        : [...initialState.categories],
    onboarded: input.onboarded === true,
    theme: input.theme === "light" ? "light" : "dark",
    customMappings:
      input.customMappings && typeof input.customMappings === "object" ? input.customMappings : {},
  };
  return { state, dropped };
}
