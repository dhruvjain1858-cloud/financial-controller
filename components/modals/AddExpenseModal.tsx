"use client";

import { useState, useEffect } from "react";
import { Modal } from "@/components/Modal";
import { useFinancial } from "@/context/FinancialContext";
import { todayISO } from "@/utils/helpers";
import { CurrencyInput } from "@/components/CurrencyInput";
import { detectCategory } from "@/utils/smartInput";

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

export function AddExpenseModal({ isOpen, onClose }: Props) {
  const { state, addTransaction, addCustomMapping } = useFinancial();
  const [amount, setAmount] = useState("");
  const [category, setCategory] = useState(state.categories[0] || "Other");
  const [date, setDate] = useState(todayISO());
  const [description, setDescription] = useState("");
  const [creditCardId, setCreditCardId] = useState("");
  const [error, setError] = useState("");

  const [detectedCat, setDetectedCat] = useState<{ category: string; confidence: string } | null>(null);
  const [duplicateWarning, setDuplicateWarning] = useState(false);

  // Auto-categorize based on description
  useEffect(() => {
    if (description) {
      const detection = detectCategory(description, state.customMappings);
      setDetectedCat(detection);
      if (detection.category !== "Other" && state.categories.includes(detection.category)) {
        setCategory(detection.category);
      }
    } else {
      setDetectedCat(null);
    }
  }, [description, state.categories, state.customMappings]);

  const handleSubmit = () => {
    const num = Number(amount);
    if (!num || num <= 0) {
      setError("Enter a valid amount greater than 0");
      return;
    }

    // Duplicate detection
    if (!duplicateWarning) {
      const isDuplicate = state.transactions.some(
        t => t.amount === num && t.description?.toLowerCase() === description.toLowerCase() && t.date === date
      );
      if (isDuplicate) {
        setDuplicateWarning(true);
        setError("Duplicate detected! Click 'Add Expense' again to confirm.");
        return;
      }
    }

    let finalCategory = category;
    if (description) {
      const detection = detectCategory(description, state.customMappings);
      if ((category === "Other" || category === "Others" || category === state.categories[0]) && detection.category !== "Other" && state.categories.includes(detection.category)) {
        finalCategory = detection.category;
      }
      
      // If user manually changed the category from what was detected, save custom mapping
      if (detection.category !== "Other" && finalCategory !== detection.category) {
        addCustomMapping(description, finalCategory);
      }
    }

    addTransaction({
      type: "expense",
      amount: num,
      category: finalCategory,
      date,
      description: description || undefined,
      creditCardId: creditCardId || undefined,
    });
    setAmount("");
    setDescription("");
    setCreditCardId("");
    setError("");
    setDuplicateWarning(false);
    onClose();
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Add Expense">
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
          <label className="text-sm text-muted-foreground block mb-1.5">Category</label>
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className="w-full bg-background border border-border rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-primary transition-all appearance-none"
          >
            {state.categories
              .filter((c) => !["Salary", "Freelance", "Investment"].includes(c))
              .map((c) => (
                <option key={c} value={c}>{c}</option>
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

        <div>
          <label className="text-sm text-muted-foreground block mb-1.5">Description (optional)</label>
          <input
            type="text"
            value={description}
            onChange={(e) => { setDescription(e.target.value); setDuplicateWarning(false); setError(""); }}
            placeholder="e.g., Lunch with team"
            className="w-full bg-background border border-border rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-primary transition-all"
          />
          {detectedCat && detectedCat.category !== "Other" && (
            <p className="text-xs mt-1.5 flex items-center gap-1.5 text-muted-foreground">
              <span className="inline-block w-2 h-2 rounded-full" style={{ backgroundColor: detectedCat.confidence === "HIGH" ? "#10B981" : "#F59E0B" }} />
              Detected: <span className="font-medium text-foreground">{detectedCat.category}</span> ({detectedCat.confidence})
            </p>
          )}
        </div>

        {state.cards.length > 0 && (
          <div>
            <label className="text-sm text-muted-foreground block mb-1.5">Payment Method</label>
            <select
              value={creditCardId}
              onChange={(e) => setCreditCardId(e.target.value)}
              className="w-full bg-background border border-border rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-primary transition-all appearance-none"
            >
              <option value="">Cash / Bank Account</option>
              {state.cards.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name} (Credit Card)
                </option>
              ))}
            </select>
            {creditCardId && (
              <p className="text-xs text-muted-foreground mt-1.5">
                This will increase your card utilization instead of reducing your bank balance.
              </p>
            )}
          </div>
        )}

        <div className="pt-2 flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 py-3 rounded-xl border border-border hover:bg-white/5 transition-colors font-medium"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            className="flex-1 py-3 rounded-xl bg-danger hover:bg-danger/90 text-white font-medium transition-all"
          >
            Add Expense
          </button>
        </div>
      </div>
    </Modal>
  );
}
