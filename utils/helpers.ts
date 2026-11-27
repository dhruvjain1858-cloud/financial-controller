import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(amount);
};

export function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).substring(2, 9);
}

export function formatDate(dateString: string): string {
  return new Date(dateString).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

/** YYYY-MM-DD in the user's LOCAL timezone (toISOString() is UTC, which is
 *  the previous day in India before 05:30). */
export function localISODate(d: Date = new Date()): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

/** YYYY-MM for the local month. */
export function localMonthKey(d: Date = new Date()): string {
  return localISODate(d).slice(0, 7);
}

export function todayISO(): string {
  return localISODate();
}

/**
 * Whole days from today to a YYYY-MM-DD date, in LOCAL time; negative once it has passed.
 * (new Date("YYYY-MM-DD") is UTC midnight, which shifts the count by a day in India.)
 */
export function daysFromToday(dateString: string, today: Date = new Date()): number {
  const [y, m, d] = dateString.split("-").map(Number);
  const target = Date.UTC(y, m - 1, d);
  const start = Date.UTC(today.getFullYear(), today.getMonth(), today.getDate());
  return Math.round((target - start) / 86_400_000);
}

export function daysUntil(dateString: string): number {
  const target = new Date(dateString);
  const now = new Date();
  const diff = target.getTime() - now.getTime();
  return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
}
