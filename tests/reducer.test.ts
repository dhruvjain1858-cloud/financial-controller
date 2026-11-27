import { describe, expect, it } from "vitest";
import { financialReducer } from "@/context/FinancialContext";
import { makeState } from "./fixtures";

const base = () => makeState({ transactions: [], balance: 10000, cards: [{ id: "c1", name: "A", network: "Visa", limit: 50000, used: 0 }] });

describe("balance and card accounting", () => {
  it("cash expense lowers the bank balance", () => {
    const s = financialReducer(base(), { type: "ADD_TRANSACTION", payload: { id: "x", type: "expense", amount: 300, category: "Food", date: "2026-11-25" } });
    expect(s.balance).toBe(9700);
    expect(s.cards[0].used).toBe(0);
  });

  it("card expense raises card usage, not the bank balance", () => {
    const s = financialReducer(base(), { type: "ADD_TRANSACTION", payload: { id: "x", type: "expense", amount: 300, category: "Food", date: "2026-11-25", creditCardId: "c1" } });
    expect(s.balance).toBe(10000);
    expect(s.cards[0].used).toBe(300);
  });

  it("income raises the balance", () => {
    const s = financialReducer(base(), { type: "ADD_TRANSACTION", payload: { id: "x", type: "income", amount: 5000, category: "Salary", date: "2026-11-25" } });
    expect(s.balance).toBe(15000);
  });

  it("editing a transaction from card to cash moves the amount correctly", () => {
    let s = financialReducer(base(), { type: "ADD_TRANSACTION", payload: { id: "x", type: "expense", amount: 300, category: "Food", date: "2026-11-25", creditCardId: "c1" } });
    s = financialReducer(s, { type: "UPDATE_TRANSACTION", payload: { id: "x", type: "expense", amount: 500, category: "Food", date: "2026-11-25" } });
    expect(s.cards[0].used).toBe(0);
    expect(s.balance).toBe(9500);
  });

  it("deleting a transaction reverts its effect", () => {
    let s = financialReducer(base(), { type: "ADD_TRANSACTION", payload: { id: "x", type: "expense", amount: 300, category: "Food", date: "2026-11-25", creditCardId: "c1" } });
    s = financialReducer(s, { type: "DELETE_TRANSACTION", payload: "x" });
    expect(s.cards[0].used).toBe(0);
    expect(s.balance).toBe(10000);
    expect(s.transactions).toHaveLength(0);
  });

  it("an overpaid card bill only takes what is owed", () => {
    let s = financialReducer(base(), { type: "UPDATE_CARD", payload: { id: "c1", name: "A", network: "Visa", limit: 50000, used: 2000 } });
    s = financialReducer(s, { type: "PAY_CARD_BILL", payload: { cardId: "c1", amount: 5000 } });
    expect(s.balance).toBe(8000);
    expect(s.cards[0].used).toBe(0);
  });

  it("paying a card bill moves money from balance to the card", () => {
    let s = financialReducer(base(), { type: "UPDATE_CARD", payload: { id: "c1", name: "A", network: "Visa", limit: 50000, used: 2000 } });
    s = financialReducer(s, { type: "PAY_CARD_BILL", payload: { cardId: "c1", amount: 1500 } });
    expect(s.balance).toBe(8500);
    expect(s.cards[0].used).toBe(500);
  });

  it("deleting a card keeps its transactions but detaches them", () => {
    let s = financialReducer(base(), { type: "ADD_TRANSACTION", payload: { id: "x", type: "expense", amount: 300, category: "Food", date: "2026-11-25", creditCardId: "c1" } });
    s = financialReducer(s, { type: "DELETE_CARD", payload: "c1" });
    expect(s.cards).toHaveLength(0);
    expect(s.transactions).toHaveLength(1);
    expect(s.transactions[0].creditCardId).toBeUndefined();
  });

});

describe("paying an EMI", () => {
  const loanState = () => makeState({
    transactions: [], balance: 20000, cards: [],
    loans: [{ id: "l1", name: "Bike", totalAmount: 80000, remaining: 40000, emi: 4000, interest: 12, monthsRemaining: 10 }],
  });
  const pay = (s = loanState(), date = "2026-11-25", txId = "e1") =>
    financialReducer(s, { type: "PAY_EMI", payload: { loanId: "l1", txId, date } });

  it("books the EMI as a Loans expense and lowers the bank balance", () => {
    const s = pay();
    expect(s.balance).toBe(16000);
    expect(s.transactions[0]).toMatchObject({ type: "expense", amount: 4000, category: "Loans", description: "EMI: Bike" });
  });

  it("reduces the outstanding amount by the principal part only", () => {
    // interest = 40,000 x 12% / 12 = 400, so principal = 3,600
    const loan = pay().loans[0];
    expect(loan.remaining).toBe(36400);
    expect(loan.monthsRemaining).toBe(9);
    expect(loan.lastPaidMonth).toBe("2026-11");
  });

  it("cannot be paid twice in the same month, but can next month", () => {
    const once = pay();
    expect(pay(once, "2026-11-28", "e2")).toBe(once); // unchanged
    expect(pay(once, "2026-12-02", "e3").transactions).toHaveLength(2);
  });

  it("caps the final instalment and closes the loan", () => {
    const s = makeState({ transactions: [], balance: 5000, cards: [],
      loans: [{ id: "l1", name: "Phone", totalAmount: 30000, remaining: 1500, emi: 2500, interest: 0, monthsRemaining: 1 }] });
    const after = pay(s);
    expect(after.transactions[0].amount).toBe(1500);
    expect(after.loans[0]).toMatchObject({ remaining: 0, monthsRemaining: 0 });
    expect(pay(after, "2026-12-01", "x")).toBe(after); // closed loans have nothing due
  });
});
