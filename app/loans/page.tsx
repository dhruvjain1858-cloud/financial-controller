"use client";

import { Card } from "@/components/Card";
import { formatCurrency } from "@/utils/helpers";
import { Landmark, Calendar, Plus, Trash2 } from "lucide-react";
import { AlertBanner } from "@/components/AlertBanner";
import { motion } from "framer-motion";
import { useFinancial } from "@/context/FinancialContext";
import { AddLoanModal } from "@/components/modals/AddLoanModal";
import { useState } from "react";

export default function LoansPage() {
  const { state, deleteLoan } = useFinancial();
  const [showAdd, setShowAdd] = useState(false);
  const totalEmi = state.loans.reduce((s, l) => s + l.emi, 0);

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div className="space-y-1">
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight">Loan & EMI Planner</h1>
          <p className="text-muted-foreground text-sm">Track and optimize your debt repayment.</p>
        </div>
        <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} onClick={() => setShowAdd(true)}
          className="flex items-center gap-1.5 bg-primary hover:bg-primary/90 text-white px-4 py-2 rounded-xl text-sm font-medium transition-all">
          <Plus className="w-4 h-4" /> Add Loan
        </motion.button>
      </div>

      {totalEmi > 0 && (
        <AlertBanner type="info" title={`Total Monthly EMI: ${formatCurrency(totalEmi)}`}
          description={state.balance >= totalEmi
            ? `You have sufficient balance to cover EMIs. Remaining after EMIs: ${formatCurrency(state.balance - totalEmi)}`
            : `Warning: Your balance may not cover EMIs. Shortfall: ${formatCurrency(totalEmi - state.balance)}`} />
      )}

      {state.loans.length === 0 ? (
        <Card className="flex flex-col items-center justify-center py-16 text-center">
          <Landmark className="w-12 h-12 text-muted-foreground/30 mb-4" />
          <h3 className="font-semibold text-lg mb-1">No loans tracked</h3>
          <p className="text-muted-foreground text-sm mb-4">Add your loans to track EMIs and plan debt-free timelines.</p>
          <button onClick={() => setShowAdd(true)} className="text-primary text-sm font-medium hover:underline">+ Add Loan</button>
        </Card>
      ) : (
        <div className="grid grid-cols-1 gap-4">
          {state.loans.map((loan, i) => {
            const progress = ((loan.totalAmount - loan.remaining) / loan.totalAmount) * 100;
            return (
              <motion.div key={loan.id} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.08 }}>
                <Card className="flex flex-col md:flex-row gap-4 justify-between md:items-center">
                  <div className="flex items-start gap-3">
                    <div className="p-2.5 bg-primary/10 text-primary rounded-xl shrink-0"><Landmark className="w-5 h-5" /></div>
                    <div>
                      <h3 className="text-lg font-bold">{loan.name}</h3>
                      <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                        <Calendar className="w-3.5 h-3.5" /> {loan.monthsRemaining} months remaining @ {loan.interest}%
                      </p>
                    </div>
                  </div>
                  <div className="flex-1 md:max-w-sm w-full space-y-1.5">
                    <div className="flex justify-between text-xs">
                      <span className="text-muted-foreground">Paid</span>
                      <span className="font-medium">{Math.round(progress)}%</span>
                    </div>
                    <div className="h-2 w-full bg-muted rounded-full overflow-hidden">
                      <motion.div initial={{ width: 0 }} animate={{ width: `${progress}%` }} transition={{ duration: 1 }}
                        className="h-full bg-primary rounded-full" />
                    </div>
                  </div>
                  <div className="text-right flex items-center gap-4">
                    <div>
                      <p className="text-xs text-muted-foreground">Remaining</p>
                      <p className="text-xl font-bold">{formatCurrency(loan.remaining)}</p>
                      <p className="text-xs text-warning mt-0.5">EMI: {formatCurrency(loan.emi)}/mo</p>
                    </div>
                    <button onClick={() => deleteLoan(loan.id)}
                      className="p-2 hover:bg-danger/10 rounded-lg transition-colors text-muted-foreground hover:text-danger">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </Card>
              </motion.div>
            );
          })}
        </div>
      )}

      <AddLoanModal isOpen={showAdd} onClose={() => setShowAdd(false)} />
    </div>
  );
}
