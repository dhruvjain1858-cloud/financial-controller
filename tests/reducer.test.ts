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
