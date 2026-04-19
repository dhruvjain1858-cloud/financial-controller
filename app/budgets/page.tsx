"use client";

import { Card } from "@/components/Card";
import { formatCurrency, cn } from "@/utils/helpers";
import { BarChart3, Plus, Trash2 } from "lucide-react";
import { useFinancial } from "@/context/FinancialContext";
import { getBudgetUsage } from "@/utils/calculations";
import { AddBudgetModal } from "@/components/modals/AddBudgetModal";
import { motion } from "framer-motion";
import { useState } from "react";
import { CATEGORY_COLORS } from "@/types";

export default function BudgetsPage() {
  const { state, deleteBudget } = useFinancial();
  const [showAdd, setShowAdd] = useState(false);

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div className="space-y-1">
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight">Monthly Budgets</h1>
          <p className="text-muted-foreground text-sm">Set spending limits per category and track usage.</p>
        </div>
        <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} onClick={() => setShowAdd(true)}
          className="flex items-center gap-1.5 bg-primary hover:bg-primary/90 text-white px-4 py-2 rounded-xl text-sm font-medium transition-all">
          <Plus className="w-4 h-4" /> Set Budget
        </motion.button>
      </div>

      {state.budgets.length === 0 ? (
        <Card className="flex flex-col items-center justify-center py-16 text-center">
          <BarChart3 className="w-12 h-12 text-muted-foreground/30 mb-4" />
          <h3 className="font-semibold text-lg mb-1">No budgets set</h3>
          <p className="text-muted-foreground text-sm mb-4">Set budgets to control your spending by category.</p>
          <button onClick={() => setShowAdd(true)} className="text-primary text-sm font-medium hover:underline">+ Set Budget</button>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {state.budgets.map((budget, i) => {
            const used = getBudgetUsage(state.transactions, budget.category);
            const pct = Math.min(100, (used / budget.limit) * 100);
            const isOver = pct >= 100;
            const isWarning = pct >= 80;
            const color = CATEGORY_COLORS[budget.category] || "#9CA3AF";

            return (
              <motion.div key={budget.id} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.08 }}>
                <Card className={cn("relative overflow-hidden", isOver && "glow-danger", isWarning && !isOver && "glow-warning")}>
                  <div className="flex justify-between items-start mb-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm"
                        style={{ backgroundColor: `${color}20`, color }}>
                        {budget.category[0]}
                      </div>
                      <div>
                        <h3 className="font-semibold">{budget.category}</h3>
                        <p className="text-xs text-muted-foreground">
                          {formatCurrency(used)} / {formatCurrency(budget.limit)}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={cn("text-xs font-semibold px-2 py-0.5 rounded-full",
                        isOver ? "bg-danger/10 text-danger" : isWarning ? "bg-warning/10 text-warning" : "bg-success/10 text-success")}>
                        {Math.round(pct)}%
                      </span>
                      <button onClick={() => deleteBudget(budget.id)}
                        className="p-1.5 hover:bg-danger/10 rounded-lg transition-colors text-muted-foreground hover:text-danger">
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  <div className="h-2.5 w-full bg-muted rounded-full overflow-hidden">
                    <motion.div initial={{ width: 0 }} animate={{ width: `${pct}%` }} transition={{ duration: 1 }}
                      className={cn("h-full rounded-full",
                        isOver ? "bg-danger shadow-[0_0_10px_rgba(239,68,68,0.5)]" : isWarning ? "bg-warning" : "bg-success")} />
                  </div>

                  {isOver && <p className="text-xs text-danger mt-3">⚠ Budget exceeded by {formatCurrency(used - budget.limit)}</p>}
                  {isWarning && !isOver && <p className="text-xs text-warning mt-3">⚠ {formatCurrency(budget.limit - used)} remaining — slow down spending</p>}
                  {!isWarning && <p className="text-xs text-muted-foreground mt-3">{formatCurrency(budget.limit - used)} remaining this month</p>}
                </Card>
              </motion.div>
            );
          })}
        </div>
      )}

      <AddBudgetModal isOpen={showAdd} onClose={() => setShowAdd(false)} />
    </div>
  );
}
