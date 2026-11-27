"use client";

import { useState } from "react";
import { Modal } from "@/components/Modal";
import { useFinancial } from "@/context/FinancialContext";
import { CurrencyInput } from "@/components/CurrencyInput";
import type { CreditCard } from "@/types";

interface Props {
  isOpen: boolean;
  onClose: () => void;
  editCard?: CreditCard | null;
}

export function AddCardModal({ isOpen, onClose, editCard }: Props) {
  const { addCard, updateCard } = useFinancial();
  // Initialised from props; the parent remounts this modal (key) when editCard changes.
  const [name, setName] = useState(editCard?.name ?? "");
  const [network, setNetwork] = useState(editCard?.network ?? "Visa");
  const [limit, setLimit] = useState(editCard ? editCard.limit.toString() : "");
  const [used, setUsed] = useState(editCard ? editCard.used.toString() : "");
  const [error, setError] = useState("");

  const handleSubmit = () => {
    if (!name.trim()) { setError("Card name is required"); return; }
    const lim = Number(limit);
    const use = Number(used);
    if (!lim || lim <= 0) { setError("Enter a valid limit"); return; }
    if (use < 0) { setError("Used amount cannot be negative"); return; }

    if (editCard) {
      const result = updateCard({ ...editCard, name: name.trim(), network, limit: lim, used: use });
      if (!result.ok) { setError(result.error); return; }
    } else {
      const result = addCard({ name: name.trim(), network, limit: lim, used: use });
      if (!result.ok) { setError(result.error); return; }
    }
    setError("");
    onClose();
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={editCard ? "Edit Card" : "Add Credit Card"}>
      <div className="space-y-4">
        <div>
          <label className="text-sm text-muted-foreground block mb-1.5">Card Name *</label>
          <input
            type="text"
            value={name}
            onChange={(e) => { setName(e.target.value); setError(""); }}
            placeholder="e.g., Sapphire Reserve"
            className="w-full bg-background border border-border rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-primary transition-all"
          />
        </div>

        <div>
          <label className="text-sm text-muted-foreground block mb-1.5">Network</label>
          <select
            value={network}
            onChange={(e) => setNetwork(e.target.value)}
            className="w-full bg-background border border-border rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-primary transition-all appearance-none"
          >
            {["Visa", "Mastercard", "Amex", "RuPay", "Other"].map((n) => (
              <option key={n} value={n}>{n}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="text-sm text-muted-foreground block mb-1.5">Credit Limit *</label>
          <CurrencyInput
            value={limit}
            onChange={(v) => { setLimit(v); setError(""); }}
            placeholder="5,00,000"
          />
        </div>

        <div>
          <label className="text-sm text-muted-foreground block mb-1.5">Amount Used</label>
          <CurrencyInput
            value={used}
            onChange={(v) => { setUsed(v); setError(""); }}
            placeholder="0"
          />
        </div>

        {error && <p className="text-danger text-sm">{error}</p>}

        <div className="pt-2 flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 py-3 rounded-xl border border-border hover:bg-white/5 transition-colors font-medium"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            className="flex-1 py-3 rounded-xl bg-primary hover:bg-primary/90 text-white font-medium transition-all"
          >
            {editCard ? "Save Changes" : "Add Card"}
          </button>
        </div>
      </div>
    </Modal>
  );
}
