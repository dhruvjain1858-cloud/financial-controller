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

export function AddGoalModal({ isOpen, onClose }: Props) {
  const { addGoal } = useFinancial();
  const [title, setTitle] = useState("");
  const [target, setTarget] = useState("");
  const [saved, setSaved] = useState("0");
  const [deadline, setDeadline] = useState("");
  const [error, setError] = useState("");

  const handleSubmit = () => {
    if (!title.trim()) { setError("Title is required"); return; }
    const t = Number(target);
    if (!t || t <= 0) { setError("Enter a valid target amount"); return; }
    if (!deadline) { setError("Set a deadline"); return; }
    addGoal({
      title: title.trim(),
      targetAmount: t,
      savedAmount: Number(saved) || 0,
      deadline,
    });
    setTitle("");
    setTarget("");
    setSaved("0");
    setDeadline("");
    setError("");
    onClose();
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Add Financial Goal">
      <div className="space-y-4">
        <div>
          <label className="text-sm text-muted-foreground block mb-1.5">Goal Title *</label>
          <input
            type="text"
            value={title}
            onChange={(e) => { setTitle(e.target.value); setError(""); }}
            placeholder="e.g., Emergency Fund"
            className="w-full bg-background border border-border rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-primary transition-all"
          />
        </div>

        <div>
          <label className="text-sm text-muted-foreground block mb-1.5">Target Amount *</label>
          <CurrencyInput
            value={target}
            onChange={(v) => { setTarget(v); setError(""); }}
            placeholder="1,00,000"
          />
        </div>

        <div>
          <label className="text-sm text-muted-foreground block mb-1.5">Already Saved</label>
          <CurrencyInput
            value={saved}
            onChange={(v) => setSaved(v)}
            placeholder="0"
          />
        </div>

        <div>
          <label className="text-sm text-muted-foreground block mb-1.5">Deadline *</label>
          <input
            type="date"
            value={deadline}
            onChange={(e) => { setDeadline(e.target.value); setError(""); }}
            className="w-full bg-background border border-border rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-primary transition-all"
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
            Add Goal
          </button>
        </div>
      </div>
    </Modal>
  );
}
