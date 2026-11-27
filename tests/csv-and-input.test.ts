import { describe, expect, it } from "vitest";
import { normalizeDate, parseCSV, rowsToTransactions, transactionsToCSV } from "@/utils/csv";
import { detectCategory, parseQuickInput } from "@/utils/smartInput";

describe("CSV parsing", () => {
  it("handles quotes, escaped quotes, CRLF and blank lines", () => {
    const rows = parseCSV('Date,Description,Amount\r\n2026-11-01,"Dinner, with ""friends""",500\r\n\r\n2026-11-02,Uber,200');
    expect(rows).toEqual([
      ["Date", "Description", "Amount"],
      ["2026-11-01", 'Dinner, with "friends"', "500"],
      ["2026-11-02", "Uber", "200"],
    ]);
  });

  it("normalises Indian bank date formats day-first", () => {
    expect(normalizeDate("2026-11-05")).toBe("2026-11-05");
    expect(normalizeDate("05/11/2026")).toBe("2026-11-05");
    expect(normalizeDate("5-11-26")).toBe("2026-11-05");
    expect(normalizeDate("05 Nov 2026")).toBe("2026-11-05");
    expect(normalizeDate("05-Nov-2026 10:30")).toBe("2026-11-05");
    expect(normalizeDate("31/02/2026")).toBeNull(); // no such day
    expect(normalizeDate("yesterday")).toBeNull();
  });

  it("imports credits as income and debits as expenses with split columns", () => {
    const r = rowsToTransactions(parseCSV(
      "Txn Date,Narration,Withdrawal Amt,Deposit Amt\n01/11/2026,SALARY NOV,,50000\n02/11/2026,SWIGGY,450,\n03/11/2026,bad row,,"
    ));
    expect(r.rows).toEqual([
      { date: "2026-11-01", description: "SALARY NOV", amount: 50000, type: "income" },
      { date: "2026-11-02", description: "SWIGGY", amount: 450, type: "expense" },
    ]);
    expect(r.skipped).toBe(1);
  });

  it("uses a Dr/Cr column when there is one amount column", () => {
    const r = rowsToTransactions(parseCSV("Date,Description,Amount,Type\n2026-11-01,Refund,200,CR\n2026-11-01,Cab,150,DR"));
    expect(r.rows.map((x) => x.type)).toEqual(["income", "expense"]);
  });

  it("skips rows with unreadable dates instead of guessing", () => {
    const r = rowsToTransactions(parseCSV("Date,Description,Amount\nnot a date,Cab,150\n2026-11-01,Cab,150"));
    expect(r.rows).toHaveLength(1);
    expect(r.skipped).toBe(1);
  });

  it("reports a clear error when columns are missing", () => {
    expect(rowsToTransactions(parseCSV("foo,bar\n1,2")).error).toMatch(/Description/);
  });

  it("exports commas and quotes safely and round-trips", () => {
    const csv = transactionsToCSV([
      { id: "1", type: "expense", amount: 500, category: "Food", date: "2026-11-01", description: 'Dinner, "team"' },
    ]);
    const back = parseCSV(csv);
    expect(back[1]).toEqual(["2026-11-01", "expense", "Food", "500", 'Dinner, "team"']);
  });
});

describe("categorisation", () => {
  it("parses one-line quick entries", () => {
    expect(parseQuickInput("2,000 swiggy dinner")).toMatchObject({ amount: 2000, description: "swiggy dinner", category: "Food" });
    expect(parseQuickInput("no amount here")).toBeNull();
  });

  it("matches whole words, not substrings", () => {
    expect(detectCategory("gift for parent").category).toBe("Other"); // not Housing ("rent")
    expect(detectCategory("gym training").category).toBe("Other"); // not Transport ("train")
    expect(detectCategory("pay rent").category).toBe("Housing");
    expect(detectCategory("metro card").category).toBe("Transport");
  });

  it("prefers user-defined mappings with HIGH confidence", () => {
    expect(detectCategory("chai point", { "chai point": "Entertainment" })).toEqual({ category: "Entertainment", confidence: "HIGH" });
  });
});
