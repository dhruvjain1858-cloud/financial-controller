"use client";

import { useState } from "react";
import { Modal } from "@/components/Modal";
import { useFinancial } from "@/context/FinancialContext";
import { CurrencyInput } from "@/components/CurrencyInput";

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

export function EditProfileModal({ isOpen, onClose }: Props) {
  const { state, setUser } = useFinancial();
  const [name, setName] = useState(state.user.name);
  const [income, setIncome] = useState(state.user.monthlyIncome.toString());
  const [error, setError] = useState("");

  const handleSubmit = () => {
    if (!name.trim()) { setError("Name is required"); return; }
    const inc = Number(income);
    if (!inc || inc <= 0) { setError("Enter a valid income"); return; }
    setUser({ name: name.trim(), monthlyIncome: inc });
    onClose();
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Edit Profile">
      <div className="space-y-4">
        <div>
          <label className="text-sm text-muted-foreground block mb-1.5">Name</label>
          <input
            type="text"
            value={name}
            onChange={(e) => { setName(e.target.value); setError(""); }}
            className="w-full bg-background border border-border rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-primary transition-all"
          />
        </div>

        <div>
          <label className="text-sm text-muted-foreground block mb-1.5">Monthly Income</label>
          <CurrencyInput
            value={income}
            onChange={(v) => { setIncome(v); setError(""); }}
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
            Save Profile
          </button>
        </div>
      </div>
    </Modal>
  );
}
