import { FinancialState, AppAlert, CATEGORY_COLORS, Transaction } from "@/types";
import { localISODate, localMonthKey } from "@/utils/helpers";
import { transactionsToCSV } from "@/utils/csv";

/** Percentage of `part` in `whole`; 0 when `whole` is not positive (avoids NaN/Infinity). */
export function safePct(part: number, whole: number): number {
  return whole > 0 ? (part / whole) * 100 : 0;
}

export function getRiskLevel(used: number, limit: number): "low" | "medium" | "high" {
  if (limit <= 0) return used > 0 ? "high" : "low";
  const pct = safePct(used, limit);
  if (pct < 30) return "low";
  if (pct <= 70) return "medium";
  return "high";
}

export function getRealBalance(state: FinancialState): number {
  const totalCreditCardOutstanding = state.cards.reduce((sum, card) => sum + card.used, 0);
  return state.balance - totalCreditCardOutstanding;
}

/** Total monthly EMI across all loans. */
export function getTotalEmi(state: FinancialState): number {
  return state.loans.reduce((s, l) => s + l.emi, 0);
}

/** Real balance left after this month's EMIs are paid (negative = shortfall). */
export function getBalanceAfterEmi(state: FinancialState): number {
  return getRealBalance(state) - getTotalEmi(state);
}

/**
 * How much can be spent this month without touching money already committed:
 * a share (30% with a stated income, else 20%) of the balance left after card
 * dues and EMIs. Never negative.
 */
export function getSafeSpendingLimit(state: FinancialState): number {
  const share = state.user.monthlyIncome > 0 ? 0.3 : 0.2;
  return Math.max(0, getBalanceAfterEmi(state)) * share;
}

export function getHealthScore(state: FinancialState): number {
  let score = 50;
  const realBalance = getRealBalance(state);

  // Balance factor (0-20 pts)
  if (state.user.monthlyIncome > 0) {
    const balanceRatio = Math.max(0, realBalance) / state.user.monthlyIncome;
    score += Math.min(20, Math.round(balanceRatio * 20));
  }

  // Credit utilization (0-15 pts)
  if (state.cards.length > 0) {
    const totalLimit = state.cards.reduce((s, c) => s + c.limit, 0);
    const totalUsed = state.cards.reduce((s, c) => s + c.used, 0);
    const utilization = Math.min(1, safePct(totalUsed, totalLimit) / 100);
    score += Math.round((1 - utilization) * 15);
  } else {
    score += 15;
  }

  // Spending discipline (0-15 pts)
  const thisMonth = localMonthKey();
  const monthlyExpenses = state.transactions
    .filter((t) => t.type === "expense" && t.date.startsWith(thisMonth))
    .reduce((s, t) => s + t.amount, 0);
  if (state.user.monthlyIncome > 0) {
    const ratio = monthlyExpenses / state.user.monthlyIncome;
    score += Math.max(0, Math.round((1 - ratio) * 15));
  } else {
    score += 10;
  }

  return Math.max(0, Math.min(100, score));
}

export function getMonthlyExpenses(transactions: Transaction[]): number {
  const thisMonth = localMonthKey();
  return transactions
    .filter((t) => t.type === "expense" && t.date.startsWith(thisMonth))
    .reduce((s, t) => s + t.amount, 0);
}

export function getMonthlyIncome(transactions: Transaction[]): number {
  const thisMonth = localMonthKey();
  return transactions
    .filter((t) => t.type === "income" && t.date.startsWith(thisMonth))
    .reduce((s, t) => s + t.amount, 0);
}

export function getBudgetUsage(
  transactions: Transaction[],
  category: string
): number {
  const thisMonth = localMonthKey();
  return transactions
    .filter(
      (t) =>
        t.type === "expense" &&
        t.category === category &&
        t.date.startsWith(thisMonth)
    )
    .reduce((s, t) => s + t.amount, 0);
}

export function getSpendingByCategory(transactions: Transaction[]) {
  const thisMonth = localMonthKey();
  const expenses = transactions.filter(
    (t) => t.type === "expense" && t.date.startsWith(thisMonth)
  );
  const map: Record<string, number> = {};
  expenses.forEach((t) => {
    map[t.category] = (map[t.category] || 0) + t.amount;
  });
  return Object.entries(map)
    .map(([name, value]) => ({
      name,
      value,
      color: CATEGORY_COLORS[name] || "#9CA3AF",
    }))
    .sort((a, b) => b.value - a.value);
}

export function getWeeklyTrend(transactions: Transaction[]) {
  const days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  const now = new Date();
  const result: { name: string; spending: number }[] = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date(now);
    d.setDate(d.getDate() - i);
    const dateStr = localISODate(d);
    const total = transactions
      .filter((t) => t.type === "expense" && t.date === dateStr)
      .reduce((s, t) => s + t.amount, 0);
    result.push({ name: days[d.getDay()], spending: total });
  }
  return result;
}

export function generateAlerts(state: FinancialState): AppAlert[] {
  const alerts: AppAlert[] = [];
  const now = new Date().toISOString();
  const realBalance = getRealBalance(state);

  // Low balance
  if (realBalance < state.user.monthlyIncome * 0.2 && state.user.monthlyIncome > 0) {
    alerts.push({
      id: "alert-low-balance",
      type: "danger",
      title: "Real Balance Running Low",
      description: `Your real available balance (₹${realBalance.toLocaleString("en-IN")}) after credit card dues is below 20% of your monthly income. Reduce non-essential spending immediately.`,
      createdAt: now,
      read: false,
    });
  }

  // High credit utilization
  state.cards.forEach((card) => {
    const util = safePct(card.used, card.limit);
    if (util > 70) {
      alerts.push({
        id: `alert-card-${card.id}`,
        type: "danger",
        title: `${card.name}: High Utilization`,
        description: `${card.name} is at ${Math.round(util)}% utilization. This may damage your credit score. Avoid further usage.`,
        createdAt: now,
        read: false,
      });
    } else if (util > 50) {
      alerts.push({
        id: `alert-card-warn-${card.id}`,
        type: "warning",
        title: `${card.name}: Rising Utilization`,
        description: `${card.name} is at ${Math.round(util)}%. Consider pausing usage to stay within safe limits.`,
        createdAt: now,
        read: false,
      });
    }
  });

  // Expenses > income this month
  const monthlyExp = getMonthlyExpenses(state.transactions);
  const monthlyInc = getMonthlyIncome(state.transactions);
  if (monthlyExp > monthlyInc && monthlyInc > 0) {
    alerts.push({
      id: "alert-overspend",
      type: "danger",
      title: "Spending Exceeds Income",
      description: `You have spent ₹${monthlyExp.toLocaleString("en-IN")} this month against ₹${monthlyInc.toLocaleString("en-IN")} income. You are in deficit.`,
      createdAt: now,
      read: false,
    });
  }

  // Budget warnings
  state.budgets.forEach((b) => {
    const used = getBudgetUsage(state.transactions, b.category);
    const pct = safePct(used, b.limit);
    if (pct >= 100) {
      alerts.push({
        id: `alert-budget-exceeded-${b.id}`,
        type: "danger",
        title: `${b.category} Budget Exceeded`,
        description: `You have spent ₹${used.toLocaleString("en-IN")} against a budget of ₹${b.limit.toLocaleString("en-IN")} for ${b.category}.`,
        createdAt: now,
        read: false,
      });
    } else if (pct >= 80) {
      alerts.push({
        id: `alert-budget-warn-${b.id}`,
        type: "warning",
        title: `${b.category} Budget: ${Math.round(pct)}% Used`,
        description: `You are approaching your ${b.category} budget limit. ₹${(b.limit - used).toLocaleString("en-IN")} remaining.`,
        createdAt: now,
        read: false,
      });
    }
  });

  // EMI reminders
  const totalEmi = getTotalEmi(state);
  if (totalEmi > 0) {
    alerts.push({
      id: "alert-emi",
      type: "info",
      title: "Upcoming EMI Payments",
      description: `Total EMI of ₹${totalEmi.toLocaleString("en-IN")} is due this month. Ensure sufficient balance.`,
      createdAt: now,
      read: false,
    });
  }

  // Goals nearing completion
  state.goals.forEach((g) => {
    const pct = safePct(g.savedAmount, g.targetAmount);
    if (pct >= 90 && pct < 100) {
      alerts.push({
        id: `alert-goal-${g.id}`,
        type: "safe",
        title: `${g.title}: Almost There!`,
        description: `You are ${Math.round(pct)}% towards your goal. Only ₹${(g.targetAmount - g.savedAmount).toLocaleString("en-IN")} to go!`,
        createdAt: now,
        read: false,
      });
    }
  });

  return alerts;
}

export function generateInsights(state: FinancialState): string[] {
  const insights: string[] = [];
  const spending = getSpendingByCategory(state.transactions);

  // 1. Existing insight
  if (spending.length > 0) {
    insights.push(`Your highest expense category this month is ${spending[0].name} at ₹${spending[0].value.toLocaleString("en-IN")}.`);
  }

  // 2. Frequency pattern matching
  const todayStr = localISODate();
  const todayTx = state.transactions.filter(t => t.type === "expense" && t.date === todayStr);
  
  const categoryCountToday: Record<string, number> = {};
  todayTx.forEach(t => {
    categoryCountToday[t.category] = (categoryCountToday[t.category] || 0) + 1;
  });

  for (const [cat, count] of Object.entries(categoryCountToday)) {
    if (count >= 3) {
      insights.push(`You have recorded ${count} ${cat} expenses just today. Keep an eye on high-frequency spending.`);
    }
  }

  // 3. Frequent Swiggy orders
  const swiggyCount = state.transactions.filter(t => t.description?.toLowerCase().includes("swiggy")).length;
  if (swiggyCount > 3) {
    insights.push(`You frequently spend on Swiggy. Consider setting a specific Food budget to control this habit.`);
  }

  // 4. Transport or other category increase
  const transportThisMonth = spending.find(s => s.name === "Transport")?.value || 0;
  if (transportThisMonth > 5000) {
    insights.push(`Your Transport spending is quite high this month (₹${transportThisMonth.toLocaleString("en-IN")}). See if you can optimize your commute.`);
  }

  const monthlyExp = getMonthlyExpenses(state.transactions);
  if (state.user.monthlyIncome > 0) {
    const pct = Math.round((monthlyExp / state.user.monthlyIncome) * 100);
    insights.push(`You have used ${pct}% of your monthly income on expenses so far.`);
  }

  const totalEmi = getTotalEmi(state);
  if (totalEmi > 0) {
    const afterEmi = getBalanceAfterEmi(state);
    insights.push(
      afterEmi > 0
        ? `After EMI payments, your projected real balance will be ₹${afterEmi.toLocaleString("en-IN")}.`
        : `Warning: After EMI payments, you may have a real shortfall of ₹${Math.abs(afterEmi).toLocaleString("en-IN")}.`
    );
  }

  const daysInMonth = new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0).getDate();
  const dayOfMonth = new Date().getDate();
  const daysRemaining = daysInMonth - dayOfMonth;
  if (monthlyExp > 0 && daysRemaining > 0) {
    const dailyAvg = monthlyExp / dayOfMonth;
    const projectedTotal = dailyAvg * daysInMonth;
    if (projectedTotal > state.user.monthlyIncome && state.user.monthlyIncome > 0) {
      const daysUntilExceed = Math.round((state.user.monthlyIncome - monthlyExp) / dailyAvg);
      if (daysUntilExceed > 0) {
        insights.push(`At this pace, you may exceed your income in ${daysUntilExceed} days.`);
      }
    }
  }

  if (state.cards.length > 0) {
    const totalUsed = state.cards.reduce((s, c) => s + c.used, 0);
    const totalLimit = state.cards.reduce((s, c) => s + c.limit, 0);
    const utilization = Math.round(safePct(totalUsed, totalLimit));
    insights.push(`Your overall credit utilization is ${utilization}%. ${utilization > 50 ? "Consider reducing usage." : "Looking healthy."}`);
  }

  return insights;
}

export function exportToCSV(transactions: Transaction[]): void {
  const csv = transactionsToCSV(transactions);
  const blob = new Blob([csv], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `transactions-${localISODate()}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}
