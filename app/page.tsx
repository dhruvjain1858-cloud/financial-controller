"use client";

import { Card } from "@/components/Card";
import { AlertBanner } from "@/components/AlertBanner";
import { formatCurrency, cn } from "@/utils/helpers";
import { GradientAreaChart } from "@/components/Chart";
import { motion } from "framer-motion";
import { ArrowDownRight, Activity, Wallet, CreditCard, TrendingDown, TrendingUp, Sparkles } from "lucide-react";
import { useFinancial } from "@/context/FinancialContext";
import { getHealthScore, getMonthlyExpenses, getMonthlyIncome, generateAlerts, generateInsights, getWeeklyTrend, getRealBalance } from "@/utils/calculations";
import { QuickAddTransaction } from "@/components/QuickAddTransaction";
import { PayCardBillModal } from "@/components/modals/PayCardBillModal";
import { useState } from "react";

export default function Dashboard() {
  const { state } = useFinancial();
  const [showPayBill, setShowPayBill] = useState(false);

  const healthScore = getHealthScore(state);
  const monthlyExp = getMonthlyExpenses(state.transactions);
  const monthlyInc = getMonthlyIncome(state.transactions);
  const alerts = generateAlerts(state);
  const insights = generateInsights(state);
  const weeklyTrend = getWeeklyTrend(state.transactions);
  const totalEmi = state.loans.reduce((s, l) => s + l.emi, 0);
  const totalCardDue = state.cards.reduce((s, c) => s + c.used, 0);
  const realBalance = getRealBalance(state);
  const topAlert = alerts.find(a => a.type === "danger") || alerts.find(a => a.type === "warning");

  const safeLimit = state.user.monthlyIncome > 0 ? realBalance * 0.3 : realBalance * 0.2;
  const spentRatio = state.user.monthlyIncome > 0 ? Math.min(100, (monthlyExp / state.user.monthlyIncome) * 100) : 0;

  const statusLabel = healthScore >= 70 ? "Stable" : healthScore >= 40 ? "Caution" : "At Risk";
  const statusColor = healthScore >= 70 ? "text-success bg-success/10" : healthScore >= 40 ? "text-warning bg-warning/10" : "text-danger bg-danger/10";

  const hasData = state.transactions.length > 0 || state.balance > 0;

  return (
    <div className="space-y-6">
      <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} className="space-y-1">
        <h1 className="text-2xl md:text-3xl font-bold tracking-tight">
          Welcome back{state.user.name ? `, ${state.user.name}` : ""}
        </h1>
        <p className="text-muted-foreground text-sm">Here is your financial status today.</p>
      </motion.div>

      {/* Quick Add Bar */}
      <QuickAddTransaction />

      {/* Main metrics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6">
        <Card className="md:col-span-2 relative overflow-hidden">
          <div className="absolute top-0 right-0 p-6 opacity-5"><Wallet className="w-28 h-28" /></div>
          <div className="relative z-10 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-medium text-muted-foreground">Real Balance</h3>
              <div className={cn("flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium", statusColor)}>
                <Activity className="w-3.5 h-3.5" /> {statusLabel}
              </div>
            </div>
            
            <h2 className="text-4xl md:text-5xl font-bold tracking-tight">{formatCurrency(realBalance)}</h2>
            
            <div className="flex gap-4 pt-1 items-center">
              <div className="text-sm">
                <span className="text-muted-foreground mr-1.5">Bank:</span>
                <span className="font-medium text-foreground">{formatCurrency(state.balance)}</span>
              </div>
              <div className="text-sm flex items-center">
                <span className="text-muted-foreground mr-1.5">CC Due:</span>
                <span className={cn("font-medium", totalCardDue > 0 ? "text-danger" : "text-success")}>
                  {formatCurrency(totalCardDue)}
                </span>
                {totalCardDue > 0 && (
                  <button 
                    onClick={() => setShowPayBill(true)}
                    className="ml-2 px-2 py-0.5 bg-danger/10 text-danger hover:bg-danger/20 rounded-md text-xs font-medium transition-colors"
                  >
                    Pay
                  </button>
                )}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4 pt-2">
              <div className="p-3 rounded-lg bg-success/5 border border-success/10">
                <div className="flex items-center gap-1.5 text-success text-xs font-medium mb-1">
                  <TrendingUp className="w-3.5 h-3.5" /> Income (this month)
                </div>
                <p className="font-semibold">{formatCurrency(monthlyInc)}</p>
              </div>
              <div className="p-3 rounded-lg bg-danger/5 border border-danger/10">
                <div className="flex items-center gap-1.5 text-danger text-xs font-medium mb-1">
                  <TrendingDown className="w-3.5 h-3.5" /> Expenses (this month)
                </div>
                <p className="font-semibold">{formatCurrency(monthlyExp)}</p>
              </div>
            </div>
            {state.user.monthlyIncome > 0 && (
              <div className="pt-2">
                <div className="flex justify-between text-xs mb-1.5">
                  <span className="text-muted-foreground">Safe Spending Limit</span>
                  <span className="font-medium">{formatCurrency(safeLimit)}</span>
                </div>
                <div className="h-2 w-full bg-muted rounded-full overflow-hidden">
                  <motion.div initial={{ width: 0 }} animate={{ width: `${Math.min(100, spentRatio)}%` }}
                    transition={{ duration: 1, delay: 0.2 }}
                    className={cn("h-full rounded-full", spentRatio > 80 ? "bg-danger" : spentRatio > 50 ? "bg-gradient-to-r from-success to-warning" : "bg-success")} />
                </div>
              </div>
            )}
          </div>
        </Card>

        <Card className="flex flex-col justify-between items-center text-center p-6">
          <h3 className="text-sm font-medium text-muted-foreground mb-3">Health Score</h3>
          <div className="relative flex items-center justify-center w-28 h-28">
            <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
              <circle cx="50" cy="50" r="42" fill="none" stroke="currentColor" strokeWidth="8" className="text-muted/50" />
              <motion.circle cx="50" cy="50" r="42" fill="none" strokeWidth="8" strokeLinecap="round"
                className={healthScore >= 70 ? "text-success" : healthScore >= 40 ? "text-warning" : "text-danger"}
                stroke="currentColor" strokeDasharray={264} initial={{ strokeDashoffset: 264 }}
                animate={{ strokeDashoffset: 264 - (264 * healthScore) / 100 }}
                transition={{ duration: 1.2, ease: "easeOut" }} />
            </svg>
            <span className="absolute text-3xl font-bold">{healthScore}</span>
          </div>
          <p className="mt-3 text-xs text-muted-foreground">
            {healthScore >= 70 ? "Excellent financial health" : healthScore >= 40 ? "Room for improvement" : "Needs immediate attention"}
          </p>
        </Card>
      </div>

      {/* AI Alert */}
      {topAlert && (
        <AlertBanner type={topAlert.type} title={topAlert.title} description={topAlert.description} />
      )}

      {/* Charts + Future Sim */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
        <Card className="space-y-4">
          <h3 className="text-sm font-semibold flex items-center gap-2">
            <Activity className="w-4 h-4 text-primary" /> Weekly Spending Trend
          </h3>
          {hasData ? (
            <GradientAreaChart data={weeklyTrend} dataKey="name" categories={["spending"]} colors={["#3B82F6"]} height={220} />
          ) : (
            <div className="h-[220px] flex items-center justify-center text-muted-foreground text-sm">
              Add expenses to see your spending trend
            </div>
          )}
        </Card>

        <Card className="space-y-4">
          <h3 className="text-sm font-semibold flex items-center gap-2">
            <CreditCard className="w-4 h-4 text-purple-500" /> Future Simulation
          </h3>
          <div className="space-y-3">
            <div className="p-3 rounded-lg bg-card border border-border/50 flex justify-between items-center">
              <span className="text-muted-foreground text-sm">Current Balance</span>
              <span className="font-semibold">{formatCurrency(state.balance)}</span>
            </div>
            {totalEmi > 0 && (
              <div className="p-3 rounded-lg bg-warning/5 border border-warning/20 flex justify-between items-center relative overflow-hidden">
                <div className="absolute left-0 top-0 bottom-0 w-1 bg-warning" />
                <span className="text-warning font-medium text-xs flex items-center gap-1 ml-2">
                  <ArrowDownRight className="w-3.5 h-3.5" /> EMIs ({state.loans.length})
                </span>
                <span className="font-semibold text-warning text-sm">-{formatCurrency(totalEmi)}</span>
              </div>
            )}
            <div className="p-3 rounded-lg glass flex justify-between items-center border-t border-white/10">
              <span className="text-muted-foreground font-medium text-sm">Projected Balance</span>
              <span className={cn("font-bold text-lg", state.balance - totalEmi < 0 ? "text-danger" : "text-primary")}>
                {formatCurrency(state.balance - totalEmi)}
              </span>
            </div>
          </div>
        </Card>
      </div>

      {/* AI Insights */}
      {insights.length > 0 && (
        <Card className="bg-gradient-to-br from-primary/10 to-purple-500/10 border-primary/20">
          <div className="flex gap-3">
            <div className="p-2 rounded-full bg-primary/20 text-primary shrink-0 self-start">
              <Sparkles className="w-4 h-4" />
            </div>
            <div className="space-y-2">
              <h4 className="font-semibold text-primary text-sm">AI Insights</h4>
              {insights.slice(0, 3).map((insight, i) => (
                <p key={i} className="text-sm text-muted-foreground">• {insight}</p>
              ))}
            </div>
          </div>
        </Card>
      )}

      <PayCardBillModal isOpen={showPayBill} onClose={() => setShowPayBill(false)} />
    </div>
  );
}