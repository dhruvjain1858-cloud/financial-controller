"use client";

import React, { createContext, useContext, useReducer, useEffect, useCallback, ReactNode } from "react";
import {
  FinancialState,
  Transaction,
  CreditCard,
  Loan,
  Budget,
  Goal,
  User,
  initialState,
} from "@/types";
import { detectCategory } from "@/utils/smartInput";

// ─── Action types ───────────────────────────────────────────────
type Action =
  | { type: "LOAD_STATE"; payload: FinancialState }
  | { type: "SET_USER"; payload: User }
  | { type: "SET_BALANCE"; payload: number }
  | { type: "COMPLETE_ONBOARDING" }
  | { type: "SET_THEME"; payload: "dark" | "light" }
  // transactions
  | { type: "ADD_TRANSACTION"; payload: Transaction }
  | { type: "UPDATE_TRANSACTION"; payload: Transaction }
  | { type: "DELETE_TRANSACTION"; payload: string }
  | { type: "PAY_CARD_BILL"; payload: { cardId: string; amount: number } }
  // cards
  | { type: "ADD_CARD"; payload: CreditCard }
  | { type: "UPDATE_CARD"; payload: CreditCard }
  | { type: "DELETE_CARD"; payload: string }
  // loans
  | { type: "ADD_LOAN"; payload: Loan }
  | { type: "UPDATE_LOAN"; payload: Loan }
  | { type: "DELETE_LOAN"; payload: string }
  // budgets
  | { type: "ADD_BUDGET"; payload: Budget }
  | { type: "UPDATE_BUDGET"; payload: Budget }
  | { type: "DELETE_BUDGET"; payload: string }
  // goals
  | { type: "ADD_GOAL"; payload: Goal }
  | { type: "UPDATE_GOAL"; payload: Goal }
  | { type: "DELETE_GOAL"; payload: string }
  // categories
  | { type: "ADD_CATEGORY"; payload: string }
  | { type: "DELETE_CATEGORY"; payload: string }
  | { type: "ADD_CUSTOM_MAPPING"; payload: { description: string; category: string } }
  | { type: "SIGN_OUT" };

// ─── Reducer ────────────────────────────────────────────────────
function financialReducer(state: FinancialState, action: Action): FinancialState {
  switch (action.type) {
    case "LOAD_STATE":
      return { ...action.payload };
    case "SET_USER":
      return { ...state, user: action.payload };
    case "SET_BALANCE":
      return { ...state, balance: action.payload };
    case "COMPLETE_ONBOARDING":
      return { ...state, onboarded: true };
    case "SIGN_OUT":
      return { ...initialState };
    case "SET_THEME":
      return { ...state, theme: action.payload };

    // ── Transactions ──
    case "ADD_TRANSACTION": {
      const tx = action.payload;
      let balanceDelta = tx.type === "income" ? tx.amount : -tx.amount;
      let newCards = state.cards;

      if (tx.type === "expense" && tx.creditCardId) {
        balanceDelta = 0; // Don't deduct from bank balance
        newCards = state.cards.map(c => 
          c.id === tx.creditCardId ? { ...c, used: Math.max(0, c.used + tx.amount) } : c
        );
      }

      return {
        ...state,
        transactions: [tx, ...state.transactions],
        balance: state.balance + balanceDelta,
        cards: newCards,
      };
    }
    case "UPDATE_TRANSACTION": {
      const oldTx = state.transactions.find((t) => t.id === action.payload.id);
      if (!oldTx) return state;
      const newTx = action.payload;

      let balanceDelta = 0;
      let newCards = state.cards;

      // Revert old transaction
      if (oldTx.type === "expense" && oldTx.creditCardId) {
        newCards = newCards.map(c => c.id === oldTx.creditCardId ? { ...c, used: Math.max(0, c.used - oldTx.amount) } : c);
      } else {
        balanceDelta -= oldTx.type === "income" ? oldTx.amount : -oldTx.amount;
      }

      // Apply new transaction
      if (newTx.type === "expense" && newTx.creditCardId) {
        newCards = newCards.map(c => c.id === newTx.creditCardId ? { ...c, used: Math.max(0, c.used + newTx.amount) } : c);
      } else {
        balanceDelta += newTx.type === "income" ? newTx.amount : -newTx.amount;
      }

      return {
        ...state,
        transactions: state.transactions.map((t) => (t.id === action.payload.id ? action.payload : t)),
        balance: state.balance + balanceDelta,
        cards: newCards,
      };
    }
    case "DELETE_TRANSACTION": {
      const tx = state.transactions.find((t) => t.id === action.payload);
      if (!tx) return state;

      let balanceDelta = 0;
      let newCards = state.cards;

      if (tx.type === "expense" && tx.creditCardId) {
        newCards = newCards.map(c => c.id === tx.creditCardId ? { ...c, used: Math.max(0, c.used - tx.amount) } : c);
      } else {
        balanceDelta = tx.type === "income" ? -tx.amount : tx.amount;
      }

      return {
        ...state,
        transactions: state.transactions.filter((t) => t.id !== action.payload),
        balance: state.balance + balanceDelta,
        cards: newCards,
      };
    }
    case "PAY_CARD_BILL": {
      return {
        ...state,
        balance: state.balance - action.payload.amount,
        cards: state.cards.map((c) => 
          c.id === action.payload.cardId ? { ...c, used: Math.max(0, c.used - action.payload.amount) } : c
        ),
      };
    }

    // ── Cards ──
    case "ADD_CARD":
      return { ...state, cards: [...state.cards, action.payload] };
    case "UPDATE_CARD":
      return { ...state, cards: state.cards.map((c) => (c.id === action.payload.id ? action.payload : c)) };
    case "DELETE_CARD":
      return { ...state, cards: state.cards.filter((c) => c.id !== action.payload) };

    // ── Loans ──
    case "ADD_LOAN":
      return { ...state, loans: [...state.loans, action.payload] };
    case "UPDATE_LOAN":
      return { ...state, loans: state.loans.map((l) => (l.id === action.payload.id ? action.payload : l)) };
    case "DELETE_LOAN":
      return { ...state, loans: state.loans.filter((l) => l.id !== action.payload) };

    // ── Budgets ──
    case "ADD_BUDGET":
      return { ...state, budgets: [...state.budgets, action.payload] };
    case "UPDATE_BUDGET":
      return { ...state, budgets: state.budgets.map((b) => (b.id === action.payload.id ? action.payload : b)) };
    case "DELETE_BUDGET":
      return { ...state, budgets: state.budgets.filter((b) => b.id !== action.payload) };

    // ── Goals ──
    case "ADD_GOAL":
      return { ...state, goals: [...state.goals, action.payload] };
    case "UPDATE_GOAL":
      return { ...state, goals: state.goals.map((g) => (g.id === action.payload.id ? action.payload : g)) };
    case "DELETE_GOAL":
      return { ...state, goals: state.goals.filter((g) => g.id !== action.payload) };

    // ── Categories ──
    case "ADD_CATEGORY":
      if (state.categories.includes(action.payload)) return state;
      return { ...state, categories: [...state.categories, action.payload] };
    case "DELETE_CATEGORY":
      return { ...state, categories: state.categories.filter((c) => c !== action.payload) };

    case "ADD_CUSTOM_MAPPING":
      return {
        ...state,
        customMappings: {
          ...(state.customMappings || {}),
          [action.payload.description]: action.payload.category,
        },
      };

    default:
      return state;
  }
}

// ─── Context shape ──────────────────────────────────────────────
interface FinancialContextType {
  state: FinancialState;
  dispatch: React.Dispatch<Action>;
  // helpers
  addTransaction: (tx: Omit<Transaction, "id">) => void;
  updateTransaction: (tx: Transaction) => void;
  deleteTransaction: (id: string) => void;
  payCardBill: (cardId: string, amount: number) => void;
  addCard: (card: Omit<CreditCard, "id">) => void;
  updateCard: (card: CreditCard) => void;
  deleteCard: (id: string) => void;
  addLoan: (loan: Omit<Loan, "id">) => void;
  updateLoan: (loan: Loan) => void;
  deleteLoan: (id: string) => void;
  addBudget: (budget: Omit<Budget, "id">) => void;
  updateBudget: (budget: Budget) => void;
  deleteBudget: (id: string) => void;
  addGoal: (goal: Omit<Goal, "id">) => void;
  updateGoal: (goal: Goal) => void;
  deleteGoal: (id: string) => void;
  addCategory: (cat: string) => void;
  deleteCategory: (cat: string) => void;
  addCustomMapping: (description: string, category: string) => void;
  setUser: (user: User) => void;
  setBalance: (balance: number) => void;
  completeOnboarding: () => void;
  toggleTheme: () => void;
  signOut: () => void;
}

const FinancialContext = createContext<FinancialContextType | undefined>(undefined);

const STORAGE_KEY = "financial-controller-state";

function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).substring(2, 9);
}

// ─── Provider ───────────────────────────────────────────────────
export function FinancialProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(financialReducer, initialState);
  const [loaded, setLoaded] = React.useState(false);

  // Load from localStorage
  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved) as FinancialState;
        
        // MIGRATION: Fix incorrect "Others" categories based on description
        if (parsed.transactions && Array.isArray(parsed.transactions)) {
          const loadedMappings = parsed.customMappings || {};
          parsed.transactions = parsed.transactions.map(tx => {
            if ((tx.category === "Other" || tx.category === "Others") && tx.description) {
              const result = detectCategory(tx.description, loadedMappings);
              if (result.category !== "Other") {
                return { ...tx, category: result.category };
              }
            }
            return tx;
          });
        }

        dispatch({ type: "LOAD_STATE", payload: { ...initialState, ...parsed } });
      } else {
        // No saved state, check system preference
        const isDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
        if (!isDark) {
          dispatch({ type: "SET_THEME", payload: "light" });
        }
      }
    } catch {
      // ignore parse errors
    }
    setLoaded(true);
  }, []);

  // Persist to localStorage on every state change
  useEffect(() => {
    if (loaded) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    }
  }, [state, loaded]);

  // Theme sync
  useEffect(() => {
    if (loaded) {
      if (state.theme === "dark") {
        document.documentElement.classList.add("dark");
        document.documentElement.classList.remove("light");
      } else {
        document.documentElement.classList.add("light");
        document.documentElement.classList.remove("dark");
      }
    }
  }, [state.theme, loaded]);

  // ── Action helpers ──
  const addTransaction = useCallback((tx: Omit<Transaction, "id">) => {
    dispatch({ type: "ADD_TRANSACTION", payload: { ...tx, id: generateId() } });
  }, []);
  const updateTransaction = useCallback((tx: Transaction) => {
    dispatch({ type: "UPDATE_TRANSACTION", payload: tx });
  }, []);
  const deleteTransaction = useCallback((id: string) => {
    dispatch({ type: "DELETE_TRANSACTION", payload: id });
  }, []);
  const payCardBill = useCallback((cardId: string, amount: number) => {
    dispatch({ type: "PAY_CARD_BILL", payload: { cardId, amount } });
  }, []);

  const addCard = useCallback((card: Omit<CreditCard, "id">) => {
    dispatch({ type: "ADD_CARD", payload: { ...card, id: generateId() } });
  }, []);
  const updateCard = useCallback((card: CreditCard) => {
    dispatch({ type: "UPDATE_CARD", payload: card });
  }, []);
  const deleteCard = useCallback((id: string) => {
    dispatch({ type: "DELETE_CARD", payload: id });
  }, []);

  const addLoan = useCallback((loan: Omit<Loan, "id">) => {
    dispatch({ type: "ADD_LOAN", payload: { ...loan, id: generateId() } });
  }, []);
  const updateLoan = useCallback((loan: Loan) => {
    dispatch({ type: "UPDATE_LOAN", payload: loan });
  }, []);
  const deleteLoan = useCallback((id: string) => {
    dispatch({ type: "DELETE_LOAN", payload: id });
  }, []);

  const addBudget = useCallback((budget: Omit<Budget, "id">) => {
    dispatch({ type: "ADD_BUDGET", payload: { ...budget, id: generateId() } });
  }, []);
  const updateBudget = useCallback((budget: Budget) => {
    dispatch({ type: "UPDATE_BUDGET", payload: budget });
  }, []);
  const deleteBudget = useCallback((id: string) => {
    dispatch({ type: "DELETE_BUDGET", payload: id });
  }, []);

  const addGoal = useCallback((goal: Omit<Goal, "id">) => {
    dispatch({ type: "ADD_GOAL", payload: { ...goal, id: generateId() } });
  }, []);
  const updateGoal = useCallback((goal: Goal) => {
    dispatch({ type: "UPDATE_GOAL", payload: goal });
  }, []);
  const deleteGoal = useCallback((id: string) => {
    dispatch({ type: "DELETE_GOAL", payload: id });
  }, []);

  const addCategory = useCallback((cat: string) => {
    dispatch({ type: "ADD_CATEGORY", payload: cat });
  }, []);
  const deleteCategory = useCallback((cat: string) => {
    dispatch({ type: "DELETE_CATEGORY", payload: cat });
  }, []);

  const addCustomMapping = useCallback((description: string, category: string) => {
    dispatch({ type: "ADD_CUSTOM_MAPPING", payload: { description: description.toLowerCase().trim(), category } });
  }, []);

  const setUser = useCallback((user: User) => {
    dispatch({ type: "SET_USER", payload: user });
  }, []);
  const setBalance = useCallback((balance: number) => {
    dispatch({ type: "SET_BALANCE", payload: balance });
  }, []);
  const completeOnboarding = useCallback(() => {
    dispatch({ type: "COMPLETE_ONBOARDING" });
  }, []);
  const toggleTheme = useCallback(() => {
    const newTheme = state.theme === "dark" ? "light" : "dark";
    dispatch({ type: "SET_THEME", payload: newTheme });
    if (newTheme === "dark") {
      document.documentElement.classList.add("dark");
      document.documentElement.classList.remove("light");
    } else {
      document.documentElement.classList.add("light");
      document.documentElement.classList.remove("dark");
    }
  }, [state.theme]);

  const signOut = useCallback(() => {
    localStorage.clear(); // Clear all localStorage as requested
    window.location.href = "/"; // Full reload to clear all state and redirect
  }, []);

  if (!loaded) return null; // avoid flash

  return (
    <FinancialContext.Provider
      value={{
        state,
        dispatch,
        addTransaction,
        updateTransaction,
        deleteTransaction,
        payCardBill,
        addCard,
        updateCard,
        deleteCard,
        addLoan,
        updateLoan,
        deleteLoan,
        addBudget,
        updateBudget,
        deleteBudget,
        addGoal,
        updateGoal,
        deleteGoal,
        addCategory,
        deleteCategory,
        addCustomMapping,
        setUser,
        setBalance,
        completeOnboarding,
        toggleTheme,
        signOut,
      }}
    >
      {children}
    </FinancialContext.Provider>
  );
}

export function useFinancial() {
  const context = useContext(FinancialContext);
  if (!context) throw new Error("useFinancial must be used within FinancialProvider");
  return context;
}
