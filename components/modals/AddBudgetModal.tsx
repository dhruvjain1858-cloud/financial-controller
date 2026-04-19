"use client";

import { useState } from "react";
import { Modal } from "@/components/Modal";
import { useFinancial } from "@/context/FinancialContext";
import { CurrencyInput } from "@/components/CurrencyInput";

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

export function AddBudgetModal({ isOpen, onClose }: Props) {
  const { state, addBudget } = useFinancial();
  const expCats = state.categories.filter(c => !["Salary","Freelance","Investment"].includes(c));
  const [category, setCategory] = useState(expCats[0] || "Other");
  const [limit, setLimit] = useState("");
  const [error, setError] = useState("");

  const handleSubmit = () => {
    const lim = Number(limit);
    if (!lim || lim <= 0) { setError("Enter a valid budget limit"); return; }
    if (state.budgets.some(b => b.category === category)) { setError("Budget already exists for this category"); return; }
    addBudget({ category, limit: lim });
    setLimit(""); setError(""); onClose();
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Set Budget">
      <div className="space-y-4">
        <div>
          <label className="text-sm text-muted-foreground block mb-1.5">Category</label>
          <select value={category} onChange={e => { setCategory(e.target.value); setError(""); }}
            className="w-full bg-background border border-border rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-primary transition-all appearance-none">
            {expCats.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>
        <div>
          <label className="text-sm text-muted-foreground block mb-1.5">Monthly Limit *</label>
          <CurrencyInput
            value={limit}
            onChange={(v) => { setLimit(v); setError(""); }}
            placeholder="10,000"
          />
        </div>
        {error && <p className="text-danger text-sm">{error}</p>}
        <div className="pt-2 flex gap-3">
          <button onClick={onClose} className="flex-1 py-3 rounded-xl border border-border hover:bg-white/5 transition-colors font-medium">Cancel</button>
          <button onClick={handleSubmit} className="flex-1 py-3 rounded-xl bg-primary hover:bg-primary/90 text-white font-medium transition-all">Set Budget</button>
        </div>
      </div>
    </Modal>
  );
}
