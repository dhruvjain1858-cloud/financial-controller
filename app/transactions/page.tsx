"use client";

import { Card } from "@/components/Card";
import { formatCurrency, formatDate, cn } from "@/utils/helpers";
import { Receipt, Trash2, ArrowUpRight, ArrowDownRight, Download, Search, Filter } from "lucide-react";
import { useFinancial } from "@/context/FinancialContext";
import { exportToCSV } from "@/utils/calculations";
import { motion } from "framer-motion";
import { useState, useMemo } from "react";
import { CATEGORY_COLORS } from "@/types";

export default function TransactionsPage() {
  const { state, deleteTransaction } = useFinancial();
  const [search, setSearch] = useState("");
  const [filterType, setFilterType] = useState<"all" | "income" | "expense">("all");
  const [sortBy, setSortBy] = useState<"date" | "amount">("date");

  const filtered = useMemo(() => {
    let txs = [...state.transactions];
    if (filterType !== "all") txs = txs.filter(t => t.type === filterType);
    if (search.trim()) {
      const s = search.toLowerCase();
      txs = txs.filter(t => t.category.toLowerCase().includes(s) || t.description?.toLowerCase().includes(s) || t.amount.toString().includes(s));
    }
    if (sortBy === "date") txs.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    else txs.sort((a, b) => b.amount - a.amount);
    return txs;
  }, [state.transactions, filterType, search, sortBy]);

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div className="space-y-1">
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight">Transactions</h1>
          <p className="text-muted-foreground text-sm">{state.transactions.length} total transactions</p>
        </div>
        {state.transactions.length > 0 && (
          <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
            onClick={() => exportToCSV(state.transactions)}
            className="flex items-center gap-1.5 bg-muted hover:bg-muted/80 px-4 py-2 rounded-xl text-sm font-medium transition-all">
            <Download className="w-4 h-4" /> Export CSV
          </motion.button>
        )}
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input type="text" value={search} onChange={e => setSearch(e.target.value)} placeholder="Search by category, description, or amount..."
            className="w-full bg-background border border-border rounded-xl pl-10 pr-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary transition-all" />
        </div>
        <div className="flex gap-2">
          {(["all", "income", "expense"] as const).map(t => (
            <button key={t} onClick={() => setFilterType(t)}
              className={cn("px-3 py-2 rounded-xl text-xs font-medium transition-all border",
                filterType === t ? "bg-primary/10 text-primary border-primary/20" : "bg-background border-border text-muted-foreground hover:bg-white/5")}>
              {t === "all" ? "All" : t === "income" ? "Income" : "Expenses"}
            </button>
          ))}
          <button onClick={() => setSortBy(s => s === "date" ? "amount" : "date")}
            className="px-3 py-2 rounded-xl text-xs font-medium bg-background border border-border text-muted-foreground hover:bg-white/5 transition-all">
            Sort: {sortBy === "date" ? "Date" : "Amount"}
          </button>
        </div>
      </div>

      {filtered.length === 0 ? (
        <Card className="flex flex-col items-center justify-center py-16 text-center">
          <Receipt className="w-12 h-12 text-muted-foreground/30 mb-4" />
          <h3 className="font-semibold text-lg mb-1">{state.transactions.length === 0 ? "No transactions yet" : "No results found"}</h3>
          <p className="text-muted-foreground text-sm">{state.transactions.length === 0 ? "Add your first income or expense to get started." : "Try adjusting your search or filters."}</p>
        </Card>
      ) : (
        <div className="space-y-2">
          {filtered.map((tx, i) => (
            <motion.div key={tx.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: Math.min(i * 0.03, 0.3) }}>
              <div className="flex items-center gap-3 p-3 rounded-xl glass hover:bg-white/5 transition-colors group">
                <div className={cn("w-9 h-9 rounded-full flex items-center justify-center shrink-0",
                  tx.type === "income" ? "bg-success/10 text-success" : "bg-danger/10 text-danger")}>
                  {tx.type === "income" ? <ArrowUpRight className="w-4 h-4" /> : <ArrowDownRight className="w-4 h-4" />}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-sm truncate">{tx.category}</span>
                    <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ backgroundColor: CATEGORY_COLORS[tx.category] || "#9CA3AF" }} />
                  </div>
                  {tx.description && <p className="text-xs text-muted-foreground truncate">{tx.description}</p>}
                </div>
                <div className="text-right">
                  <p className={cn("font-semibold text-sm", tx.type === "income" ? "text-success" : "text-danger")}>
                    {tx.type === "income" ? "+" : "-"}{formatCurrency(tx.amount)}
                  </p>
                  <p className="text-[10px] text-muted-foreground">{formatDate(tx.date)}</p>
                </div>
                <button onClick={() => deleteTransaction(tx.id)}
                  className="p-1.5 opacity-0 group-hover:opacity-100 hover:bg-danger/10 rounded-lg transition-all text-muted-foreground hover:text-danger">
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}
