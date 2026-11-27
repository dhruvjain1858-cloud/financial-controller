import { useState } from "react";
import { Modal } from "@/components/Modal";
import { useFinancial } from "@/context/FinancialContext";
import { CurrencyInput } from "@/components/CurrencyInput";

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

export function PayCardBillModal({ isOpen, onClose }: Props) {
  const { state, payCardBill } = useFinancial();
  const [pickedCardId, setPickedCardId] = useState("");
  const [typedAmount, setTypedAmount] = useState<string | null>(null);
  const [error, setError] = useState("");

  // Default to the first card with dues, prefilled with its outstanding amount,
  // until the user picks a card or types an amount (derived, not copied into state).
  const defaultCard = state.cards.find(c => c.used > 0) || state.cards[0];
  const selectedCardId = state.cards.some(c => c.id === pickedCardId) ? pickedCardId : defaultCard?.id ?? "";
  const selectedCard = state.cards.find(c => c.id === selectedCardId);
  const amount = typedAmount ?? (selectedCard && selectedCard.used > 0 ? selectedCard.used.toString() : "");
  const setSelectedCardId = setPickedCardId;
  const setAmount = (v: string) => setTypedAmount(v);

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
