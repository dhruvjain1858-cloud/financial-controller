"use client";

import { Card } from "@/components/Card";
import { formatCurrency, daysUntil, cn } from "@/utils/helpers";
import { Target, Plus, Trash2, CheckCircle2 } from "lucide-react";
import { useFinancial } from "@/context/FinancialContext";
import { AddGoalModal } from "@/components/modals/AddGoalModal";
import { Modal } from "@/components/Modal";
import { CurrencyInput } from "@/components/CurrencyInput";
import { motion } from "framer-motion";
import { useState } from "react";
import { getSpendingByCategory } from "@/utils/calculations";
import { AlertCircle, TrendingUp, CheckCircle, Clock } from "lucide-react";

export default function GoalsPage() {
  const { state, deleteGoal, updateGoal } = useFinancial();
  const [showAdd, setShowAdd] = useState(false);
  const [addFundsGoal, setAddFundsGoal] = useState<string | null>(null);
  const [fundsAmount, setFundsAmount] = useState("");

  const handleAddFunds = () => {
    const goal = state.goals.find(g => g.id === addFundsGoal);
    if (!goal) return;
    const amt = Number(fundsAmount);
    if (!amt || amt <= 0) return;
    updateGoal({ ...goal, savedAmount: Math.min(goal.targetAmount, goal.savedAmount + amt) });
    setFundsAmount("");
    setFundsAmount("");
    setAddFundsGoal(null);
  };

  const spending = getSpendingByCategory(state.transactions);
  const topCategory = spending.length > 0 ? spending[0].name : "unnecessary";
  const monthlyIncome = state.user.monthlyIncome || 1; // prevent division by zero

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div className="space-y-1">
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight">Financial Goals</h1>
          <p className="text-muted-foreground text-sm">Track your savings targets and deadlines.</p>
        </div>
        <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} onClick={() => setShowAdd(true)}
          className="flex items-center gap-1.5 bg-primary hover:bg-primary/90 text-white px-4 py-2 rounded-xl text-sm font-medium transition-all">
          <Plus className="w-4 h-4" /> Add Goal
        </motion.button>
      </div>

      {state.goals.length === 0 ? (
        <Card className="flex flex-col items-center justify-center py-16 text-center">
          <Target className="w-12 h-12 text-muted-foreground/30 mb-4" />
          <h3 className="font-semibold text-lg mb-1">No goals yet</h3>
          <p className="text-muted-foreground text-sm mb-4">Set financial goals to stay motivated and on track.</p>
          <button onClick={() => setShowAdd(true)} className="text-primary text-sm font-medium hover:underline">+ Add Goal</button>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {state.goals.map((goal, i) => {
            const pct = Math.min(100, (goal.savedAmount / goal.targetAmount) * 100);
            const days = daysUntil(goal.deadline);
            const isComplete = goal.savedAmount >= goal.targetAmount;
            const remainingAmount = goal.targetAmount - goal.savedAmount;
            
            let status = "On Track ✅";
            let statusColor = "text-success bg-success/10";
            let dailySaving = 0;
            let monthlySaving = 0;
            
            if (isComplete) {
              status = "Goal completed 🎉";
              statusColor = "text-success bg-success/10";
            } else if (days < 0) {
              status = "Goal missed ❌";
              statusColor = "text-danger bg-danger/10";
            } else if (days === 0) {
              status = "Deadline is today ⚠️";
              statusColor = "text-warning bg-warning/10";
              dailySaving = remainingAmount;
            } else {
              dailySaving = remainingAmount / days;
              monthlySaving = remainingAmount / (days / 30.44);
              
              if (monthlySaving > monthlyIncome * 0.25) {
                status = "Behind ❌";
                statusColor = "text-danger bg-danger/10";
              } else if (monthlySaving > monthlyIncome * 0.1) {
                status = "At Risk ⚠️";
                statusColor = "text-warning bg-warning/10";
              }
            }

            return (
              <motion.div key={goal.id} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.08 }}>
                <Card className={cn("relative overflow-hidden flex flex-col min-h-full", isComplete && "glow-success")}>
                  <div className="flex justify-between items-start mb-4">
                    <div className="flex items-center gap-3">
                      <div className={cn("w-10 h-10 rounded-full flex items-center justify-center",
                        isComplete ? "bg-success/20 text-success" : "bg-primary/20 text-primary")}>
                        {isComplete ? <CheckCircle2 className="w-5 h-5" /> : <Target className="w-5 h-5" />}
                      </div>
                      <div>
                        <h3 className="font-semibold">{goal.title}</h3>
                        <div className="flex items-center gap-2 mt-0.5">
                          <span className="text-xs text-muted-foreground flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            {days > 0 ? `${days} days left` : isComplete ? "Done" : "Passed"}
                          </span>
                          <span className={cn("text-[10px] px-1.5 py-0.5 rounded-full font-medium", statusColor)}>
                            {status}
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-1">
                      {!isComplete && days >= 0 && (
                        <button onClick={() => setAddFundsGoal(goal.id)}
                          className="p-1.5 hover:bg-success/10 rounded-lg transition-colors text-muted-foreground hover:text-success">
                          <Plus className="w-3.5 h-3.5" />
                        </button>
                      )}
                      <button onClick={() => deleteGoal(goal.id)}
                        className="p-1.5 hover:bg-danger/10 rounded-lg transition-colors text-muted-foreground hover:text-danger">
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  <div className="space-y-2 mb-4">
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">{formatCurrency(goal.savedAmount)}</span>
                      <span className="font-medium">{formatCurrency(goal.targetAmount)}</span>
                    </div>
                    <div className="h-2.5 w-full bg-muted rounded-full overflow-hidden">
                      <motion.div initial={{ width: 0 }} animate={{ width: `${pct}%` }} transition={{ duration: 1 }}
                        className={cn("h-full rounded-full", isComplete ? "bg-success" : status.includes("Behind") ? "bg-danger" : status.includes("Risk") ? "bg-warning" : "bg-primary")} />
                    </div>
                    <div className="flex justify-between items-center text-xs text-muted-foreground">
                      <span>{Math.round(pct)}% achieved</span>
                      {!isComplete && <span>{formatCurrency(remainingAmount)} to go</span>}
                    </div>
                  </div>

                  {!isComplete && days > 0 && (
                    <div className="mt-auto space-y-3 pt-3 border-t border-border/40">
                      <div className="bg-primary/5 p-3 rounded-xl border border-primary/10">
                        <p className="text-xs font-medium text-foreground mb-1 flex items-center gap-1.5">
                          <TrendingUp className="w-3.5 h-3.5 text-primary" /> Required Pace
                        </p>
                        <p className="text-xs text-muted-foreground">
                          You need to save <span className="font-semibold text-foreground">{formatCurrency(dailySaving)}/day</span> or <span className="font-semibold text-foreground">{formatCurrency(monthlySaving)}/month</span> to reach this goal.
                        </p>
                      </div>
                      
                      <div className="bg-muted/30 p-3 rounded-xl border border-border/30">
                        <p className="text-xs font-medium text-foreground mb-1 flex items-center gap-1.5">
                          <AlertCircle className="w-3.5 h-3.5 text-warning" /> Smart Suggestion
                        </p>
                        <p className="text-xs text-muted-foreground">
                          Reduce <span className="font-medium">{topCategory}</span> spending by <span className="font-semibold text-foreground">{formatCurrency(dailySaving * 1.5)}/day</span> to stay ahead of track.
                        </p>
                      </div>
                    </div>
                  )}
                </Card>
              </motion.div>
            );
          })}
        </div>
      )}

      <AddGoalModal isOpen={showAdd} onClose={() => setShowAdd(false)} />

      <Modal isOpen={!!addFundsGoal} onClose={() => setAddFundsGoal(null)} title="Add Funds to Goal">
        <div className="space-y-4">
          <CurrencyInput
            value={fundsAmount}
            onChange={(v) => setFundsAmount(v)}
            placeholder="0"
          />
          <div className="flex gap-3">
            <button onClick={() => setAddFundsGoal(null)} className="flex-1 py-3 rounded-xl border border-border hover:bg-white/5 transition-colors font-medium">Cancel</button>
            <button onClick={handleAddFunds} className="flex-1 py-3 rounded-xl bg-success hover:bg-success/90 text-white font-medium transition-all">Add Funds</button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
