import { useState, useEffect } from "react";
import { Modal } from "@/components/Modal";
import { useFinancial } from "@/context/FinancialContext";
import { CurrencyInput } from "@/components/CurrencyInput";

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

export function PayCardBillModal({ isOpen, onClose }: Props) {
  const { state, payCardBill } = useFinancial();
  const [selectedCardId, setSelectedCardId] = useState("");
  const [amount, setAmount] = useState("");
  const [error, setError] = useState("");

  // Auto-select first card and fill amount
  useEffect(() => {
    if (isOpen && state.cards.length > 0 && !selectedCardId) {
      const firstCardWithDue = state.cards.find(c => c.used > 0) || state.cards[0];
      setSelectedCardId(firstCardWithDue.id);
      setAmount(firstCardWithDue.used > 0 ? firstCardWithDue.used.toString() : "");
    }
  }, [isOpen, state.cards, selectedCardId]);

  // Update amount when card changes
  const handleCardChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const id = e.target.value;
    setSelectedCardId(id);
    const card = state.cards.find(c => c.id === id);
    if (card && card.used > 0) {
      setAmount(card.used.toString());
    } else {
      setAmount("");
    }
  };

  const handlePay = () => {
    const num = Number(amount);
    if (!num || num <= 0) {
      setError("Enter a valid payment amount");
      return;
    }
    
    const card = state.cards.find(c => c.id === selectedCardId);
    if (!card) return;

    if (num > state.balance) {
      setError("Insufficient bank balance to pay this bill.");
      return;
    }

    payCardBill(selectedCardId, num);
    setAmount("");
    setError("");
    onClose();
  };

  if (state.cards.length === 0) {
    return (
      <Modal isOpen={isOpen} onClose={onClose} title="Pay Credit Card Bill">
        <p className="text-muted-foreground text-sm">You have no credit cards added.</p>
      </Modal>
    );
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Pay Credit Card Bill">
      <div className="space-y-4">
        <div>
          <label className="text-sm text-muted-foreground block mb-1.5">Select Card</label>
          <select
            value={selectedCardId}
            onChange={handleCardChange}
            className="w-full bg-background border border-border rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-primary transition-all appearance-none"
          >
            {state.cards.map(c => (
              <option key={c.id} value={c.id}>{c.name} (Due: ₹{c.used.toLocaleString('en-IN')})</option>
            ))}
          </select>
        </div>

        <div>
          <label className="text-sm text-muted-foreground block mb-1.5">Payment Amount *</label>
          <CurrencyInput
            value={amount}
            onChange={(v) => { setAmount(v); setError(""); }}
            placeholder="0"
          />
          <p className="text-xs text-muted-foreground mt-1">This will be deducted from your Bank Balance.</p>
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
            onClick={handlePay}
            className="flex-1 py-3 rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground font-medium transition-all"
          >
            Pay Bill
          </button>
        </div>
      </div>
    </Modal>
  );
}
