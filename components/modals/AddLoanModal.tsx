"use client";

import { useState } from "react";
import { Modal } from "@/components/Modal";
import { useFinancial } from "@/context/FinancialContext";
import { CurrencyInput } from "@/components/CurrencyInput";

interface Props { isOpen: boolean; onClose: () => void; }

export function AddLoanModal({ isOpen, onClose }: Props) {
  const { addLoan } = useFinancial();
  const [name, setName] = useState("");
  const [total, setTotal] = useState("");
  const [remaining, setRemaining] = useState("");
  const [emi, setEmi] = useState("");
  const [interest, setInterest] = useState("");
  const [months, setMonths] = useState("");
  const [error, setError] = useState("");

  const handleSubmit = () => {
    if (!name.trim()) { setError("Name is required"); return; }
    const t = Number(total), r = Number(remaining), e = Number(emi), int_ = Number(interest), m = Number(months);
    if (!t || t <= 0) { setError("Enter valid total amount"); return; }
    if (r < 0) { setError("Remaining cannot be negative"); return; }
    if (!e || e <= 0) { setError("Enter valid EMI"); return; }
    addLoan({ name: name.trim(), totalAmount: t, remaining: r || t, emi: e, interest: int_ || 0, monthsRemaining: m || 0 });
    setName(""); setTotal(""); setRemaining(""); setEmi(""); setInterest(""); setMonths(""); setError(""); onClose();
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Add Loan">
      <div className="space-y-4">
        <div>
          <label className="text-sm text-muted-foreground block mb-1.5">Loan Name *</label>
          <input type="text" value={name} onChange={e => { setName(e.target.value); setError(""); }} placeholder="e.g., Home Loan"
            className="w-full bg-background border border-border rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-primary transition-all" />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-sm text-muted-foreground block mb-1.5">Total Amount *</label>
            <CurrencyInput value={total} onChange={v => setTotal(v)} placeholder="50,00,000" />
          </div>
          <div>
            <label className="text-sm text-muted-foreground block mb-1.5">Remaining</label>
            <CurrencyInput value={remaining} onChange={v => setRemaining(v)} placeholder="0" />
          </div>
        </div>
        <div className="grid grid-cols-3 gap-3">
          <div>
            <label className="text-sm text-muted-foreground block mb-1.5">EMI *</label>
            <CurrencyInput value={emi} onChange={v => setEmi(v)} placeholder="42,000" />
          </div>
          <div>
            <label className="text-sm text-muted-foreground block mb-1.5">Interest %</label>
            <CurrencyInput value={interest} onChange={v => setInterest(v)} placeholder="8.5" allowDecimal noPrefix />
          </div>
          <div>
            <label className="text-sm text-muted-foreground block mb-1.5">Months Left</label>
            <CurrencyInput value={months} onChange={v => setMonths(v)} placeholder="120" noPrefix />
          </div>
        </div>
        {error && <p className="text-danger text-sm">{error}</p>}
        <div className="pt-2 flex gap-3">
          <button onClick={onClose} className="flex-1 py-3 rounded-xl border border-border hover:bg-white/5 transition-colors font-medium">Cancel</button>
          <button onClick={handleSubmit} className="flex-1 py-3 rounded-xl bg-primary hover:bg-primary/90 text-white font-medium transition-all">Add Loan</button>
        </div>
      </div>
    </Modal>
  );
}
