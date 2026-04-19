export type TransactionType = "income" | "expense";
export type RiskLevel = "low" | "medium" | "high";
export type AlertType = "safe" | "warning" | "danger" | "info";

export interface User {
  name: string;
  monthlyIncome: number;
  isDemo?: boolean;
}

export interface Transaction {
  id: string;
  type: TransactionType;
  amount: number;
  category: string;
  date: string;
  description?: string;
  creditCardId?: string;
}

export interface CreditCard {
  id: string;
  name: string;
  network: string;
  limit: number;
  used: number;
}

export interface Loan {
  id: string;
  name: string;
  totalAmount: number;
  remaining: number;
  emi: number;
  interest: number;
  monthsRemaining: number;
}

export interface Budget {
  id: string;
  category: string;
  limit: number;
}

export interface Goal {
  id: string;
  title: string;
  targetAmount: number;
  savedAmount: number;
  deadline: string;
}

export interface AppAlert {
  id: string;
  type: AlertType;
  title: string;
  description: string;
  createdAt: string;
  read: boolean;
}

export interface FinancialState {
  user: User;
  balance: number;
  transactions: Transaction[];
  cards: CreditCard[];
  loans: Loan[];
  budgets: Budget[];
  goals: Goal[];
  categories: string[];
  onboarded: boolean;
  theme: "dark" | "light";
  customMappings: Record<string, string>;
}

export const DEFAULT_CATEGORIES = [
  "Food",
  "Transport",
  "Shopping",
  "Housing",
  "Entertainment",
  "Healthcare",
  "Education",
  "Travel",
  "Utilities",
  "Salary",
  "Freelance",
  "Investment",
  "Other",
];

export const CATEGORY_COLORS: Record<string, string> = {
  Food: "#EF4444",
  Transport: "#3B82F6",
  Shopping: "#FACC15",
  Housing: "#22C55E",
  Entertainment: "#A855F7",
  Healthcare: "#EC4899",
  Education: "#14B8A6",
  Travel: "#F97316",
  Utilities: "#6366F1",
  Salary: "#10B981",
  Freelance: "#8B5CF6",
  Investment: "#06B6D4",
  Other: "#9CA3AF",
};

export const initialState: FinancialState = {
  user: { name: "", monthlyIncome: 0 },
  balance: 0,
  transactions: [],
  cards: [],
  loans: [],
  budgets: [],
  goals: [],
  categories: [...DEFAULT_CATEGORIES],
  onboarded: false,
  theme: "dark",
  customMappings: {},
};
