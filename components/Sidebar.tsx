"use client";

import { LayoutDashboard, CreditCard, PieChart, Landmark, ShieldAlert, Sparkles, Target, Wallet, Receipt, BarChart3 } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/utils/helpers";
import { motion } from "framer-motion";
import { useFinancial } from "@/context/FinancialContext";
import { generateInsights } from "@/utils/calculations";

const navItems = [
  { name: "Dashboard", href: "/", icon: LayoutDashboard },
  { name: "Credit Cards", href: "/cards", icon: CreditCard },
  { name: "Insights", href: "/insights", icon: PieChart },
  { name: "Loans & EMIs", href: "/loans", icon: Landmark },
  { name: "Transactions", href: "/transactions", icon: Receipt },
  { name: "Budgets", href: "/budgets", icon: BarChart3 },
  { name: "Goals", href: "/goals", icon: Target },
  { name: "Alerts", href: "/alerts", icon: ShieldAlert },
];

export const Sidebar = () => {
  const pathname = usePathname();
  const { state } = useFinancial();
  const insights = generateInsights(state);
  const topInsight = insights[0] || "Add transactions to get AI-powered insights.";

  return (
    <>
      {/* Desktop Sidebar */}
      <aside className="hidden md:flex flex-col w-64 h-screen border-r border-border/20 glass fixed left-0 top-0 z-40">
        <div className="p-5">
          <Link href="/" className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-primary/20 text-primary">
              <Sparkles className="w-5 h-5" />
            </div>
            <span className="text-lg font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-purple-500">
              Controller
            </span>
          </Link>
        </div>

        <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
          {navItems.map((item) => {
            const isActive = pathname === item.href || (item.href !== "/" && pathname.startsWith(item.href));
            return (
              <Link key={item.name} href={item.href}
                className={cn(
                  "flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-200 relative group text-sm",
                  isActive ? "text-primary font-medium" : "text-muted-foreground hover:text-foreground hover:bg-white/5"
                )}>
                {isActive && (
                  <motion.div layoutId="active-nav" className="absolute inset-0 bg-primary/10 rounded-xl"
                    initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.2 }} />
                )}
                <item.icon className={cn("w-4.5 h-4.5 z-10", isActive ? "text-primary" : "group-hover:text-foreground")} />
                <span className="z-10">{item.name}</span>
              </Link>
            );
          })}
        </nav>

        <div className="p-3 mt-auto">
          <div className="p-3 rounded-xl glass-card flex flex-col gap-1.5">
            <div className="flex items-center gap-1.5 text-warning">
              <Sparkles className="w-3.5 h-3.5" />
              <span className="text-[10px] font-semibold uppercase tracking-wider">AI Insight</span>
            </div>
            <p className="text-xs text-muted-foreground leading-relaxed">{topInsight}</p>
          </div>
        </div>
      </aside>

      {/* Mobile Bottom Nav */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 glass border-t border-border/20">
        <div className="flex justify-around py-2">
          {navItems.slice(0, 5).map((item) => {
            const isActive = pathname === item.href || (item.href !== "/" && pathname.startsWith(item.href));
            return (
              <Link key={item.name} href={item.href}
                className={cn("flex flex-col items-center gap-0.5 px-2 py-1 rounded-lg transition-colors",
                  isActive ? "text-primary" : "text-muted-foreground")}>
                <item.icon className="w-5 h-5" />
                <span className="text-[10px]">{item.name.split(" ")[0]}</span>
              </Link>
            );
          })}
        </div>
      </nav>
    </>
  );
};
