"use client";

import { Bell, User, Zap, Moon, Sun, Plus, Minus, LogOut, Settings, UploadCloud } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useState, useRef, useEffect } from "react";
import { useFinancial } from "@/context/FinancialContext";
import { generateAlerts, getRealBalance } from "@/utils/calculations";
import { AddExpenseModal } from "@/components/modals/AddExpenseModal";
import { AddIncomeModal } from "@/components/modals/AddIncomeModal";
import { EditProfileModal } from "@/components/modals/EditProfileModal";
import { ImportTransactionsModal } from "@/components/modals/ImportTransactionsModal";
import { Modal } from "@/components/Modal";
import { AlertBanner } from "@/components/AlertBanner";
import { CurrencyInput } from "@/components/CurrencyInput";
import { formatCurrency, cn } from "@/utils/helpers";
import Link from "next/link";

export const Navbar = () => {
  const { state, toggleTheme, signOut } = useFinancial();
  const [showProfile, setShowProfile] = useState(false);
  const [showExpense, setShowExpense] = useState(false);
  const [showIncome, setShowIncome] = useState(false);
  const [showEditProfile, setShowEditProfile] = useState(false);
  const [showImport, setShowImport] = useState(false);
  const [affordOpen, setAffordOpen] = useState(false);
  const profileRef = useRef<HTMLDivElement>(null);

  const alerts = generateAlerts(state);
  const dangerCount = alerts.filter(a => a.type === "danger").length;

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (profileRef.current && !profileRef.current.contains(e.target as Node)) setShowProfile(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  return (
    <>
      <header className="h-14 glass border-b border-border/20 flex items-center justify-between px-4 md:px-8 sticky top-0 z-30">
        <div className="flex items-center gap-3">
          <span className="text-lg font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-purple-500 md:hidden">
            Controller
          </span>
          {state.user.isDemo && (
            <span className="hidden md:flex items-center gap-1.5 px-2 py-0.5 rounded border border-warning/30 bg-warning/10 text-[10px] font-medium text-warning uppercase tracking-wider">
              Demo Account
            </span>
          )}
        </div>

        <div className="flex items-center gap-2 md:gap-3">
          <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} onClick={() => setShowImport(true)}
            className="hidden sm:flex items-center gap-1.5 bg-primary/10 hover:bg-primary/20 text-primary px-3 py-1.5 rounded-full text-xs font-medium transition-all">
            <UploadCloud className="w-3 h-3" /> <span>Import</span>
          </motion.button>

          <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} onClick={() => setShowExpense(true)}
            className="flex items-center gap-1.5 bg-danger/10 hover:bg-danger/20 text-danger px-3 py-1.5 rounded-full text-xs font-medium transition-all">
            <Minus className="w-3 h-3" /> <span className="hidden sm:inline">Expense</span>
          </motion.button>

          <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} onClick={() => setShowIncome(true)}
            className="flex items-center gap-1.5 bg-success/10 hover:bg-success/20 text-success px-3 py-1.5 rounded-full text-xs font-medium transition-all">
            <Plus className="w-3 h-3" /> <span className="hidden sm:inline">Income</span>
          </motion.button>

          <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} onClick={() => setAffordOpen(true)}
            className="hidden md:flex items-center gap-1.5 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 text-white px-3 py-1.5 rounded-full text-xs font-medium shadow-lg shadow-blue-500/20 transition-all">
            <Zap className="w-3 h-3" /> Affordability
          </motion.button>

          <button onClick={toggleTheme} className="p-1.5 text-muted-foreground hover:text-foreground transition-colors rounded-full hover:bg-white/5">
            {state.theme === "dark" ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
          </button>

          <Link href="/alerts" className="relative p-1.5 text-muted-foreground hover:text-foreground transition-colors rounded-full hover:bg-white/5">
            <Bell className="w-4 h-4" />
            {dangerCount > 0 && <span className="absolute top-0.5 right-0.5 w-2 h-2 bg-danger rounded-full animate-pulse-slow" />}
          </Link>

          <div className="relative" ref={profileRef}>
            <button onClick={() => setShowProfile(!showProfile)}
              className="w-7 h-7 rounded-full bg-gradient-to-tr from-blue-500 to-purple-500 p-[1.5px] transition-transform hover:scale-105">
              <div className="w-full h-full rounded-full bg-card flex items-center justify-center">
                <span className="text-[10px] font-bold text-muted-foreground">
                  {state.user.name ? state.user.name[0].toUpperCase() : <User className="w-3 h-3" />}
                </span>
              </div>
            </button>
            <AnimatePresence>
              {showProfile && (
                <motion.div initial={{ opacity: 0, y: 8, scale: 0.95 }} animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 8, scale: 0.95 }} transition={{ duration: 0.15 }}
                  className="absolute right-0 top-10 w-52 glass-card rounded-xl border border-white/10 overflow-hidden shadow-2xl z-50">
                  <div className="p-3 border-b border-white/5 relative overflow-hidden">
                    {state.user.isDemo && <div className="absolute top-0 right-0 bg-warning text-warning-foreground text-[8px] font-bold px-1.5 py-0.5 rounded-bl tracking-wider uppercase">Demo</div>}
                    <p className="font-semibold text-sm pr-6">{state.user.name || "User"}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">₹{state.user.monthlyIncome.toLocaleString("en-IN")}/mo</p>
                  </div>
                  <div className="py-1">
                    <button onClick={() => { setShowEditProfile(true); setShowProfile(false); }}
                      className="w-full flex items-center gap-3 px-3 py-2 text-sm hover:bg-white/5 transition-colors text-left">
                      <Settings className="w-4 h-4 text-muted-foreground" /> Edit Profile
                    </button>
                    <button onClick={signOut} className="w-full flex items-center gap-3 px-3 py-2 text-sm hover:bg-white/5 transition-colors text-left text-muted-foreground">
                      <LogOut className="w-4 h-4" /> Sign Out
                    </button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </header>

      <AddExpenseModal isOpen={showExpense} onClose={() => setShowExpense(false)} />
      <AddIncomeModal isOpen={showIncome} onClose={() => setShowIncome(false)} />
      <EditProfileModal isOpen={showEditProfile} onClose={() => setShowEditProfile(false)} />
      <ImportTransactionsModal isOpen={showImport} onClose={() => setShowImport(false)} />
      <AffordabilityModal isOpen={affordOpen} onClose={() => setAffordOpen(false)} />
    </>
  );
};

function AffordabilityModal({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  const { state } = useFinancial();
  const [amount, setAmount] = useState("");

  const totalCardUsed = state.cards.reduce((s, c) => s + c.used, 0);
  const totalCardLimit = state.cards.reduce((s, c) => s + c.limit, 0);

  const simulate = () => {
    const num = Number(amount);
    if (!num || num <= 0) return null;
    
    // Core Affordability change: Use Real Balance
    const realBalance = getRealBalance(state);
    const safeMargin = realBalance * 0.3;
    const afterBalance = realBalance - num;
    const newUtil = totalCardLimit > 0 ? Math.round(((totalCardUsed + num) / totalCardLimit) * 100) : 0;

    if (num <= realBalance - safeMargin && num < realBalance * 0.5) {
      return { status: "safe" as const, message: "Safe to proceed. This won't impact your financial safety.", afterBalance, newUtil };
    } else if (num <= realBalance) {
      return { status: "warning" as const, message: "This purchase eats into your safety margin. Proceed with caution.", afterBalance, newUtil };
    }
    return { status: "danger" as const, message: "Not recommended. This will push your real balance into deficit.", afterBalance, newUtil };
  };

  const sim = simulate();

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Can I Afford This?">
      <div className="space-y-5">
        <p className="text-muted-foreground text-sm">Enter the amount to simulate the impact on your finances.</p>
        <CurrencyInput
          value={amount}
          onChange={(v) => setAmount(v)}
          placeholder="0"
          large
        />
        {sim && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
            <AlertBanner type={sim.status}
              title={sim.status === "safe" ? "Safe Spend" : sim.status === "warning" ? "Risky Spend" : "Not Recommended"}
              description={sim.message} />
            <div className="mt-4 space-y-2.5 p-4 rounded-xl bg-card border border-border/50">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">After Purchase Real Balance</span>
                <span className={cn("font-semibold", sim.afterBalance < 0 ? "text-danger" : "text-foreground")}>{formatCurrency(sim.afterBalance)}</span>
              </div>
              {totalCardLimit > 0 && (
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Credit Utilization</span>
                  <span className={cn("font-semibold", sim.newUtil > 70 ? "text-danger" : sim.newUtil > 50 ? "text-warning" : "text-success")}>{sim.newUtil}%</span>
                </div>
              )}
            </div>
          </motion.div>
        )}
        <button onClick={onClose} className="w-full py-3 rounded-xl border border-border hover:bg-white/5 transition-colors font-medium">Close</button>
      </div>
    </Modal>
  );
}