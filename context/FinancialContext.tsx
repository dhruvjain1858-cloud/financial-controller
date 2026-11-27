"use client";

import React, { createContext, useContext, useReducer, useEffect, useCallback, useRef, useState, ReactNode } from "react";
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
import { isEmiDue, splitEmi } from "@/utils/calculations";
import { todayISO } from "@/utils/helpers";
import { useRouter } from "next/navigation";
import { supabase, isSupabaseConfigured } from "@/lib/supabaseClient";
import {
  sanitizeState,
  validateBudget,
  validateCard,
  validateGoal,
  validateLoan,
  validateTransaction,
  type ValidationResult,
} from "@/lib/validation";
import { planSync, isEmptyPlan } from "@/lib/sync/diff";
import { isRemoteEmpty, stateFromRemote } from "@/lib/sync/mapping";
import { applyPlan, loadRemote } from "@/lib/sync/supabaseRepo";

// ─── Action types ───────────────────────────────────────────────
export type Action =
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
  | { type: "PAY_EMI"; payload: { loanId: string; txId: string; date: string } }
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
export function financialReducer(state: FinancialState, action: Action): FinancialState {
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
      // Keep the transactions but detach them from the deleted card
      // (matches ON DELETE SET NULL in the database).
      return {
        ...state,
        cards: state.cards.filter((c) => c.id !== action.payload),
        transactions: state.transactions.map((t) => {
          if (t.creditCardId !== action.payload) return t;
          const { creditCardId: _removed, ...rest } = t;
          void _removed;
          return rest;
        }),
      };

    // ── Loans ──
    case "ADD_LOAN":
      return { ...state, loans: [...state.loans, action.payload] };
    case "UPDATE_LOAN":
      return { ...state, loans: state.loans.map((l) => (l.id === action.payload.id ? action.payload : l)) };
    case "PAY_EMI": {
      // One action so the expense and the loan update can never get out of step.
      const loan = state.loans.find((l) => l.id === action.payload.loanId);
      const month = action.payload.date.slice(0, 7);
      if (!loan || !isEmiDue(loan, month)) return state;
      const { principal, payment } = splitEmi(loan);
      if (payment <= 0) return state;
      const remaining = Math.max(0, Math.round((loan.remaining - principal) * 100) / 100);
      const paid: Loan = {
        ...loan,
        remaining,
        monthsRemaining: remaining === 0 ? 0 : Math.max(0, loan.monthsRemaining - 1),
        lastPaidMonth: month,
      };
      const tx: Transaction = {
        id: action.payload.txId, type: "expense", amount: payment, category: "Loans",
        date: action.payload.date, description: `EMI: ${loan.name}`,
      };
      return {
        ...state,
        balance: state.balance - payment,
        loans: state.loans.map((l) => (l.id === loan.id ? paid : l)),
        transactions: [tx, ...state.transactions],
      };
    }
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
export type SyncStatus = "local" | "loading" | "syncing" | "synced" | "error";

interface FinancialContextType {
  state: FinancialState;
  dispatch: React.Dispatch<Action>;
  /** "local" = data only in this browser; otherwise the Supabase sync state. */
  syncStatus: SyncStatus;
  syncError: string | null;
  /** Last rejected input (validation message), shown by the app shell. */
  actionError: string | null;
  clearActionError: () => void;
  retrySync: () => void;
  // helpers -- mutating helpers validate input and return the result
  addTransaction: (tx: Omit<Transaction, "id">) => ValidationResult<Transaction>;
  updateTransaction: (tx: Transaction) => ValidationResult<Transaction>;
  deleteTransaction: (id: string) => void;
  payCardBill: (cardId: string, amount: number) => void;
  addCard: (card: Omit<CreditCard, "id">) => ValidationResult<CreditCard>;
  updateCard: (card: CreditCard) => ValidationResult<CreditCard>;
  deleteCard: (id: string) => void;
  addLoan: (loan: Omit<Loan, "id">) => ValidationResult<Loan>;
  updateLoan: (loan: Loan) => ValidationResult<Loan>;
  deleteLoan: (id: string) => void;
  /** Pays this month's EMI for a loan: books a Loans expense and reduces what is owed. */
  payEmi: (loanId: string) => void;
  addBudget: (budget: Omit<Budget, "id">) => ValidationResult<Budget>;
  updateBudget: (budget: Budget) => ValidationResult<Budget>;
  deleteBudget: (id: string) => void;
  addGoal: (goal: Omit<Goal, "id">) => ValidationResult<Goal>;
  updateGoal: (goal: Goal) => ValidationResult<Goal>;
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

export const STORAGE_KEY = "financial-controller-state";

function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).substring(2, 9);
}

/** Reads the browser cache, drops invalid rows and re-categorises legacy "Other" rows. */
function readLocalState(): FinancialState | null {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (!saved) return null;
    const { state, dropped } = sanitizeState(JSON.parse(saved));
    if (dropped > 0) console.warn(`[storage] dropped ${dropped} invalid saved rows`);
    state.transactions = state.transactions.map((tx) => {
      if (tx.category === "Other" && tx.description) {
        const result = detectCategory(tx.description, state.customMappings);
        if (result.category !== "Other") return { ...tx, category: result.category };
      }
      return tx;
    });
    return state;
  } catch {
    return null; // corrupt JSON: start fresh rather than crash
  }
}

// ─── Provider ───────────────────────────────────────────────────
export function FinancialProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(financialReducer, initialState);
  const router = useRouter();
  const [loaded, setLoaded] = useState(false);
  const [syncStatus, setSyncStatus] = useState<SyncStatus>("local");
  const [syncError, setSyncError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const stateRef = useRef(state);
  const syncedRef = useRef<FinancialState | null>(null); // what the server holds; null = not syncing
  const queueRef = useRef<Promise<void>>(Promise.resolve());

  useEffect(() => {
    stateRef.current = state;
  }, [state]);

  // 1. Hydrate from the browser cache (client only; localStorage does not exist during SSR)
  useEffect(() => {
    const local = readLocalState();
    if (local) {
      dispatch({ type: "LOAD_STATE", payload: local });
    } else if (!window.matchMedia("(prefers-color-scheme: dark)").matches) {
      dispatch({ type: "SET_THEME", payload: "light" });
    }
    // Deferred so the hydrate dispatch above is applied before the first render with data.
    queueMicrotask(() => setLoaded(true));
  }, []);

  // 2. When signed in, load the user's rows from Postgres (or upload the local data once)
  const connectRemote = useCallback(async (authId: string, email: string | undefined, fallbackName: string) => {
    if (!isSupabaseConfigured) return;
    setSyncStatus("loading");
    try {
      const remote = await loadRemote(supabase, authId);
      const local = stateRef.current;
      if (isRemoteEmpty(remote)) {
        // First sign-in on this account: move what is in this browser to the database
        // (sample data is never uploaded; the user starts onboarding fresh instead).
        const seed: FinancialState = local.user.isDemo
          ? { ...initialState, user: { name: fallbackName, monthlyIncome: 0, isDemo: false } }
          : { ...local, user: { ...local.user, name: local.user.name || fallbackName, isDemo: false } };
        const plan = planSync({ ...initialState, categories: [] }, seed);
        plan.profile = { ...plan.profile!, email: email ?? null };
        await applyPlan(supabase, plan);
        dispatch({ type: "LOAD_STATE", payload: seed });
        syncedRef.current = seed;
      } else {
        const fromDb = stateFromRemote(remote);
        if (!fromDb.user.name) fromDb.user.name = fallbackName;
        dispatch({ type: "LOAD_STATE", payload: fromDb });
        syncedRef.current = fromDb;
      }
      setSyncError(null);
      setSyncStatus("synced");
    } catch (err) {
      syncedRef.current = null;
      setSyncError(err instanceof Error ? err.message : String(err));
      setSyncStatus("error");
    }
  }, []);

  useEffect(() => {
    if (!loaded || !isSupabaseConfigured) return;
    const start = (session: { user: { id: string; email?: string; user_metadata?: Record<string, unknown> } } | null) => {
      if (!session) return;
      const u = session.user;
      const fallbackName = (u.user_metadata?.full_name as string | undefined) || u.email?.split("@")[0] || "User";
      if (syncedRef.current === null) void connectRemote(u.id, u.email, fallbackName);
    };
    supabase.auth.getSession().then(({ data }) => start(data.session));
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "SIGNED_OUT") {
        syncedRef.current = null;
        setSyncStatus("local");
      } else {
        start(session);
      }
    });
    return () => subscription.unsubscribe();
  }, [loaded, connectRemote]);

  // 3. Write-through: after every change, send only the rows that changed
  useEffect(() => {
    if (!loaded) return;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); // offline cache
    const synced = syncedRef.current;
    if (!synced) return;
    const plan = planSync(synced, state);
    if (isEmptyPlan(plan)) return;
    const target = state;
    queueRef.current = queueRef.current
      .then(async () => {
        setSyncStatus("syncing");
        await applyPlan(supabase, plan);
        syncedRef.current = target;
        setSyncError(null);
        setSyncStatus("synced");
      })
      .catch((err) => {
        // syncedRef keeps the last confirmed server state, so the next change
        // (or retrySync) re-sends everything that did not make it.
        setSyncError(err instanceof Error ? err.message : String(err));
        setSyncStatus("error");
      });
  }, [state, loaded]);

  const retrySync = useCallback(() => {
    const synced = syncedRef.current;
    if (!synced) return;
    const plan = planSync(synced, stateRef.current);
    const target = stateRef.current;
    queueRef.current = queueRef.current
      .then(async () => {
        setSyncStatus("syncing");
        await applyPlan(supabase, plan);
        syncedRef.current = target;
        setSyncError(null);
        setSyncStatus("synced");
      })
      .catch((err) => {
        setSyncError(err instanceof Error ? err.message : String(err));
        setSyncStatus("error");
      });
  }, []);

  // Theme sync
  useEffect(() => {
    if (!loaded) return;
    document.documentElement.classList.toggle("dark", state.theme === "dark");
    document.documentElement.classList.toggle("light", state.theme === "light");
  }, [state.theme, loaded]);

  // ── Action helpers (validate first; invalid input never reaches state or the database) ──
  const guard = useCallback(<T,>(result: ValidationResult<T>, apply: (value: T) => void): ValidationResult<T> => {
    if (result.ok) {
      setActionError(null);
      apply(result.value);
    } else {
      setActionError(result.error);
    }
    return result;
  }, []);

  const addTransaction = useCallback((tx: Omit<Transaction, "id">) =>
    guard(validateTransaction({ ...tx, id: generateId() }), (v) => dispatch({ type: "ADD_TRANSACTION", payload: v })), [guard]);
  const updateTransaction = useCallback((tx: Transaction) =>
    guard(validateTransaction(tx), (v) => dispatch({ type: "UPDATE_TRANSACTION", payload: v })), [guard]);
  const deleteTransaction = useCallback((id: string) => {
    dispatch({ type: "DELETE_TRANSACTION", payload: id });
  }, []);
  const payCardBill = useCallback((cardId: string, amount: number) => {
    if (!(amount > 0)) { setActionError("amount: Must be greater than 0"); return; }
    dispatch({ type: "PAY_CARD_BILL", payload: { cardId, amount } });
  }, []);

  const addCard = useCallback((card: Omit<CreditCard, "id">) =>
    guard(validateCard({ ...card, id: generateId() }), (v) => dispatch({ type: "ADD_CARD", payload: v })), [guard]);
  const updateCard = useCallback((card: CreditCard) =>
    guard(validateCard(card), (v) => dispatch({ type: "UPDATE_CARD", payload: v })), [guard]);
  const deleteCard = useCallback((id: string) => {
    dispatch({ type: "DELETE_CARD", payload: id });
  }, []);

  const addLoan = useCallback((loan: Omit<Loan, "id">) =>
    guard(validateLoan({ ...loan, id: generateId() }), (v) => dispatch({ type: "ADD_LOAN", payload: v })), [guard]);
  const updateLoan = useCallback((loan: Loan) =>
    guard(validateLoan(loan), (v) => dispatch({ type: "UPDATE_LOAN", payload: v })), [guard]);
  const deleteLoan = useCallback((id: string) => {
    dispatch({ type: "DELETE_LOAN", payload: id });
  }, []);

  const payEmi = useCallback((loanId: string) => {
    dispatch({ type: "PAY_EMI", payload: { loanId, txId: generateId(), date: todayISO() } });
  }, []);

  const addBudget = useCallback((budget: Omit<Budget, "id">) => {
    if (stateRef.current.budgets.some((b) => b.category === budget.category)) {
      const r: ValidationResult<Budget> = { ok: false, error: `category: a ${budget.category} budget already exists` };
      setActionError(r.error);
      return r;
    }
    return guard(validateBudget({ ...budget, id: generateId() }), (v) => dispatch({ type: "ADD_BUDGET", payload: v }));
  }, [guard]);
  const updateBudget = useCallback((budget: Budget) =>
    guard(validateBudget(budget), (v) => dispatch({ type: "UPDATE_BUDGET", payload: v })), [guard]);
  const deleteBudget = useCallback((id: string) => {
    dispatch({ type: "DELETE_BUDGET", payload: id });
  }, []);

  const addGoal = useCallback((goal: Omit<Goal, "id">) =>
    guard(validateGoal({ ...goal, id: generateId() }), (v) => dispatch({ type: "ADD_GOAL", payload: v })), [guard]);
  const updateGoal = useCallback((goal: Goal) =>
    guard(validateGoal(goal), (v) => dispatch({ type: "UPDATE_GOAL", payload: v })), [guard]);
  const deleteGoal = useCallback((id: string) => {
    dispatch({ type: "DELETE_GOAL", payload: id });
  }, []);

  const addCategory = useCallback((cat: string) => {
    const name = cat.trim();
    if (name) dispatch({ type: "ADD_CATEGORY", payload: name });
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
    if (Number.isFinite(balance)) dispatch({ type: "SET_BALANCE", payload: balance });
  }, []);
  const completeOnboarding = useCallback(() => {
    dispatch({ type: "COMPLETE_ONBOARDING" });
  }, []);
  const toggleTheme = useCallback(() => {
    dispatch({ type: "SET_THEME", payload: stateRef.current.theme === "dark" ? "light" : "dark" });
  }, []);

  const signOut = useCallback(async () => {
    await queueRef.current; // let pending writes finish
    syncedRef.current = null; // stop syncing before the state is cleared
    if (isSupabaseConfigured) await supabase.auth.signOut();
    localStorage.removeItem(STORAGE_KEY); // only this app's cache, not every site key
    dispatch({ type: "SIGN_OUT" }); // back to an empty, not-onboarded state
    setSyncStatus("local");
    router.replace("/");
  }, [router]);

  const clearActionError = useCallback(() => setActionError(null), []);

  if (!loaded) return null; // avoid a flash of empty state before hydration

  return (
    <FinancialContext.Provider
      value={{
        state,
        dispatch,
        syncStatus,
        syncError,
        actionError,
        clearActionError,
        retrySync,
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
        payEmi,
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
