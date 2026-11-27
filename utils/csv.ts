import type { Transaction, TransactionType } from "@/types";

/** RFC-4180-style CSV parser: quoted fields, escaped quotes (""), CRLF/LF, blank lines skipped. */
export function parseCSV(text: string): string[][] {
  const rows: string[][] = [];
  let currentRow: string[] = [];
  let currentVal = "";
  let insideQuotes = false;

  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    const nextChar = text[i + 1];

    if (char === '"' && insideQuotes && nextChar === '"') {
      currentVal += '"';
      i++;
    } else if (char === '"') {
      insideQuotes = !insideQuotes;
    } else if (char === "," && !insideQuotes) {
      currentRow.push(currentVal.trim());
      currentVal = "";
    } else if ((char === "\n" || char === "\r") && !insideQuotes) {
      if (char === "\r" && nextChar === "\n") i++;
      currentRow.push(currentVal.trim());
      if (currentRow.some((v) => v !== "")) rows.push(currentRow);
      currentRow = [];
      currentVal = "";
    } else {
      currentVal += char;
    }
  }
  if (currentVal || currentRow.length > 0) {
    currentRow.push(currentVal.trim());
    if (currentRow.some((v) => v !== "")) rows.push(currentRow);
  }
  return rows;
}

const MONTHS: Record<string, number> = {
  jan: 1, feb: 2, mar: 3, apr: 4, may: 5, jun: 6, jul: 7, aug: 8, sep: 9, oct: 10, nov: 11, dec: 12,
};

function isoIfValid(y: number, m: number, d: number): string | null {
  if (y < 100) y += 2000;
  const dt = new Date(Date.UTC(y, m - 1, d));
  if (dt.getUTCFullYear() !== y || dt.getUTCMonth() !== m - 1 || dt.getUTCDate() !== d) return null;
  return `${y}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
}

/**
 * Normalises common bank-statement date formats to YYYY-MM-DD.
 * Numeric dates are read day-first (DD/MM/YYYY), the Indian convention.
 * Returns null when the date cannot be read, so callers can skip the row
 * instead of silently storing a wrong date.
 */
export function normalizeDate(raw: string): string | null {
  // drop a trailing time ("10:30", "T10:30:00Z") but keep "05 Nov 2026"
  const s = raw.trim().replace(/[ T]\d{1,2}:\d{2}.*$/, "").trim();
  let m = s.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
  if (m) return isoIfValid(+m[1], +m[2], +m[3]);
  m = s.match(/^(\d{1,2})[/.-](\d{1,2})[/.-](\d{2,4})$/);
  if (m) return isoIfValid(+m[3], +m[2], +m[1]);
  m = s.match(/^(\d{1,2})[-/ ]([A-Za-z]{3})[A-Za-z]*[-/ ,]+(\d{2,4})$/);
  if (m && MONTHS[m[2].toLowerCase()]) return isoIfValid(+m[3], MONTHS[m[2].toLowerCase()], +m[1]);
  return null;
}

export interface ImportedRow {
  date: string;
  description: string;
  amount: number;
  type: TransactionType;
}

export interface ImportResult {
  rows: ImportedRow[];
  skipped: number;
  error?: string;
}

const parseAmount = (s: string | undefined): number => {
  if (!s) return NaN;
  const n = parseFloat(s.replace(/[^0-9.-]/g, ""));
  return Number.isFinite(n) ? n : NaN;
};

/**
 * Turns parsed CSV rows into transactions.
 * - Separate Debit / Credit columns -> expense / income.
 * - A single Amount column plus a Type or Dr/Cr column -> uses that column.
 * - A single Amount column alone -> expense (the common export format).
 */
export function rowsToTransactions(rows: string[][]): ImportResult {
  if (rows.length < 2) return { rows: [], skipped: 0, error: "CSV must contain a header row and at least one data row." };

  const headers = rows[0].map((h) => h.toLowerCase().replace(/[^a-z/]/g, ""));
  const find = (...keys: string[]) => headers.findIndex((h) => keys.some((k) => h.includes(k)));
  const dateIdx = find("date", "time");
  const descIdx = find("desc", "narration", "details", "title", "payee", "particulars");
  const debitIdx = headers.findIndex((h) => h.includes("debit") || h.includes("withdrawal"));
  const creditIdx = headers.findIndex((h) => h.includes("credit") || h.includes("deposit"));
  const amountIdx = find("amount", "value");
  const typeIdx = headers.findIndex((h) => h === "type" || h === "drcr" || h === "cr/dr" || h === "dr/cr");

  const splitColumns = debitIdx !== -1 && creditIdx !== -1;
  if (descIdx === -1 || (!splitColumns && amountIdx === -1 && debitIdx === -1)) {
    return { rows: [], skipped: 0, error: "Could not find Description and Amount (or Debit/Credit) columns." };
  }

  const out: ImportedRow[] = [];
  let skipped = 0;
  for (const row of rows.slice(1)) {
    const description = (row[descIdx] ?? "").replace(/^[^\w\s]+/, "").trim();
    const date = dateIdx === -1 ? null : normalizeDate(row[dateIdx] ?? "");
    let amount = NaN;
    let type: TransactionType = "expense";

    if (splitColumns) {
      const debit = parseAmount(row[debitIdx]);
      const credit = parseAmount(row[creditIdx]);
      if (credit > 0) { amount = credit; type = "income"; }
      else if (debit > 0) { amount = debit; type = "expense"; }
    } else {
      amount = Math.abs(parseAmount(row[amountIdx !== -1 ? amountIdx : debitIdx]));
      const t = typeIdx !== -1 ? (row[typeIdx] ?? "").toLowerCase() : "";
      if (t === "cr" || t === "credit" || t === "income") type = "income";
    }

    if (!description || !date || !(amount > 0)) { skipped++; continue; }
    out.push({ date, description, amount, type });
  }
  return { rows: out, skipped };
}

/** CSV-escapes one field: quotes it when it contains a comma, quote or newline. */
export function csvField(value: string): string {
  return /[",\r\n]/.test(value) ? `"${value.replace(/"/g, '""')}"` : value;
}

export function transactionsToCSV(transactions: Transaction[]): string {
  const headers = ["Date", "Type", "Category", "Amount", "Description"];
  const rows = transactions.map((t) => [t.date, t.type, t.category, t.amount.toString(), t.description || ""]);
  return [headers, ...rows].map((r) => r.map(csvField).join(",")).join("\n");
}
