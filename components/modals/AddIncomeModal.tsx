"use client";

import { useState } from "react";
import { Modal } from "@/components/Modal";
import { useFinancial } from "@/context/FinancialContext";
import { todayISO } from "@/utils/helpers";
import { CurrencyInput } from "@/components/CurrencyInput";

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

export function AddIncomeModal({ isOpen, onClose }: Props) {
  const { addTransaction } = useFinancial();
  const [amount, setAmount] = useState("");
  const [source, setSource] = useState("Salary");
  const [date, setDate] = useState(todayISO());
  const [error, setError] = useState("");

  const sources = ["Salary", "Freelance", "Investment", "Other"];

  const handleSubmit = () => {
    const num = Number(amount);
    if (!num || num <= 0) {
      setError("Enter a valid amount greater than 0");
      return;
    }
    addTransaction({
      type: "income",
      amount: num,
      category: source,
      date,
    });
    setAmount("");
    setError("");
    onClose();
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Add Income">
      <div className="space-y-4">
        <div>
          <label className="text-sm text-muted-foreground block mb-1.5">Amount *</label>
          <CurrencyInput
            value={amount}
            onChange={(v) => { setAmount(v); setError(""); }}
            placeholder="0"
          />
          {error && <p className="text-danger text-xs mt-1">{error}</p>}
        </div>

        <div>
          <label className="text-sm text-muted-foreground block mb-1.5">Source</label>
          <select
            value={source}
            onChange={(e) => setSource(e.target.value)}
            className="w-full bg-background border border-border rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-primary transition-all appearance-none"
          >
            {sources.map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="text-sm text-muted-foreground block mb-1.5">Date</label>
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="w-full bg-background border border-border rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-primary transition-all"
          />
        </div>

        <div className="pt-2 flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 py-3 rounded-xl border border-border hover:bg-white/5 transition-colors font-medium"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            className="flex-1 py-3 rounded-xl bg-success hover:bg-success/90 text-white font-medium transition-all"
          >
            Add Income
          </button>
        </div>
      </div>
    </Modal>
  );
}
