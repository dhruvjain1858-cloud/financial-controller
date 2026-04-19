"use client";

import { Card } from "@/components/Card";
import { AlertBanner } from "@/components/AlertBanner";
import { formatCurrency, cn } from "@/utils/helpers";
import { motion } from "framer-motion";
import { CreditCard, AlertTriangle, ShieldCheck, Plus, Pencil, Trash2 } from "lucide-react";
import { useFinancial } from "@/context/FinancialContext";
import { getRiskLevel } from "@/utils/calculations";
import { AddCardModal } from "@/components/modals/AddCardModal";
import { useState } from "react";
import type { CreditCard as CardType } from "@/types";

export default function CardsPage() {
  const { state, deleteCard } = useFinancial();
  const [showAdd, setShowAdd] = useState(false);
  const [editCard, setEditCard] = useState<CardType | null>(null);

  const highUtilCard = state.cards.find(c => (c.used / c.limit) * 100 > 70);

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div className="space-y-1">
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight">Credit Card Control</h1>
          <p className="text-muted-foreground text-sm">Manage utilization and prevent score damage.</p>
        </div>
        <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} onClick={() => setShowAdd(true)}
          className="flex items-center gap-1.5 bg-primary hover:bg-primary/90 text-white px-4 py-2 rounded-xl text-sm font-medium transition-all">
          <Plus className="w-4 h-4" /> Add Card
        </motion.button>
      </div>

      {highUtilCard && (
        <AlertBanner type="warning" title="Action Required"
          description={`${highUtilCard.name} is approaching its safe usage limit. Avoid using it to maintain optimal credit score.`} />
      )}

      {state.cards.length === 0 ? (
        <Card className="flex flex-col items-center justify-center py-16 text-center">
          <CreditCard className="w-12 h-12 text-muted-foreground/30 mb-4" />
          <h3 className="font-semibold text-lg mb-1">No credit cards yet</h3>
          <p className="text-muted-foreground text-sm mb-4">Add your first card to start tracking utilization.</p>
          <button onClick={() => setShowAdd(true)} className="text-primary text-sm font-medium hover:underline">+ Add Credit Card</button>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
          {state.cards.map((card, i) => {
            const pctUsed = (card.used / card.limit) * 100;
            const risk = getRiskLevel(card.used, card.limit);
            const isHigh = risk === "high";
            const isMed = risk === "medium";

            return (
              <motion.div key={card.id} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.08 }}>
                <Card className="relative overflow-hidden group hover:-translate-y-1 transition-transform duration-300">
                  <div className="absolute top-0 right-0 p-6 opacity-5 group-hover:opacity-10 transition-opacity">
                    <CreditCard className="w-36 h-36" />
                  </div>
                  <div className="relative z-10 space-y-5">
                    <div className="flex justify-between items-start">
                      <div>
                        <h3 className="text-lg font-bold">{card.name}</h3>
                        <p className="text-xs text-muted-foreground">{card.network}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className={cn("flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold border",
                          isHigh ? "bg-danger/10 text-danger border-danger/20" : isMed ? "bg-warning/10 text-warning border-warning/20" : "bg-success/10 text-success border-success/20")}>
                          {isHigh ? <AlertTriangle className="w-3 h-3" /> : <ShieldCheck className="w-3 h-3" />}
                          {risk.charAt(0).toUpperCase() + risk.slice(1)}
                        </div>
                        <button onClick={() => setEditCard(card)} className="p-1.5 hover:bg-white/10 rounded-lg transition-colors text-muted-foreground hover:text-foreground">
                          <Pencil className="w-3.5 h-3.5" />
                        </button>
                        <button onClick={() => deleteCard(card.id)} className="p-1.5 hover:bg-danger/10 rounded-lg transition-colors text-muted-foreground hover:text-danger">
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Utilized</span>
                        <span className="font-medium">{formatCurrency(card.used)} / {formatCurrency(card.limit)}</span>
                      </div>
                      <div className="relative h-2.5 w-full bg-muted rounded-full overflow-hidden">
                        <motion.div initial={{ width: 0 }} animate={{ width: `${pctUsed}%` }} transition={{ duration: 1 }}
                          className={cn("absolute top-0 left-0 h-full rounded-full",
                            isHigh ? "bg-danger shadow-[0_0_10px_rgba(239,68,68,0.5)]" : isMed ? "bg-warning shadow-[0_0_10px_rgba(250,204,21,0.5)]" : "bg-primary")} />
                      </div>
                      <p className="text-xs text-muted-foreground">{Math.round(pctUsed)}% used</p>
                    </div>

                    {isHigh && (
                      <p className="text-xs text-danger/80 bg-danger/5 p-2 rounded-lg">⚠ Avoid usage. High utilization damages credit score.</p>
                    )}
                  </div>
                </Card>
              </motion.div>
            );
          })}
        </div>
      )}

      <AddCardModal isOpen={showAdd || !!editCard} onClose={() => { setShowAdd(false); setEditCard(null); }} editCard={editCard} />
    </div>
  );
}
