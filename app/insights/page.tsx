"use client";

import { Card } from "@/components/Card";
import { DonutChart, GradientAreaChart } from "@/components/Chart";
import { formatCurrency } from "@/utils/helpers";
import { Sparkles, PieChart } from "lucide-react";
import { useFinancial } from "@/context/FinancialContext";
import { getSpendingByCategory, getWeeklyTrend, generateInsights } from "@/utils/calculations";
import { CATEGORY_COLORS } from "@/types";

export default function InsightsPage() {
  const { state } = useFinancial();
  const spending = getSpendingByCategory(state.transactions);
  const weeklyTrend = getWeeklyTrend(state.transactions);
  const insights = generateInsights(state);
  const totalSpend = spending.reduce((s, c) => s + c.value, 0);

  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <h1 className="text-2xl md:text-3xl font-bold tracking-tight">Spending Insights</h1>
        <p className="text-muted-foreground text-sm">AI-powered analysis of your financial behavior.</p>
      </div>

      {spending.length === 0 ? (
        <Card className="flex flex-col items-center justify-center py-16 text-center">
          <PieChart className="w-12 h-12 text-muted-foreground/30 mb-4" />
          <h3 className="font-semibold text-lg mb-1">No spending data yet</h3>
          <p className="text-muted-foreground text-sm">Add expenses to see your spending breakdown and AI insights.</p>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6">
          <Card className="md:col-span-2 flex flex-col min-h-[380px]">
            <h3 className="text-sm font-medium mb-2">Category Breakdown</h3>
            <div className="flex-1 relative flex items-center justify-center">
              <DonutChart data={spending} height={320} />
              <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                <span className="text-xs text-muted-foreground">Total Spend</span>
                <span className="text-xl font-bold">{formatCurrency(totalSpend)}</span>
              </div>
            </div>
          </Card>

          <div className="space-y-4">
            {insights.length > 0 && (
              <Card className="bg-gradient-to-br from-primary/15 to-purple-500/15 border-primary/20">
                <div className="flex gap-3">
                  <div className="p-2 rounded-full bg-primary/20 text-primary shrink-0 self-start">
                    <Sparkles className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="font-semibold text-primary text-sm mb-1">AI Observation</h4>
                    <p className="text-sm text-muted-foreground">{insights[0]}</p>
                  </div>
                </div>
              </Card>
            )}

            <Card className="space-y-3">
              <h3 className="font-medium text-muted-foreground text-xs uppercase tracking-wider">Top Categories</h3>
              {spending.slice(0, 5).map((item) => (
                <div key={item.name} className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold"
                    style={{ backgroundColor: `${item.color}20`, color: item.color }}>
                    {item.name[0]}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex justify-between text-sm mb-0.5">
                      <span className="font-medium truncate">{item.name}</span>
                      <span className="font-semibold text-xs">{formatCurrency(item.value)}</span>
                    </div>
                    <div className="h-1 w-full bg-muted rounded-full overflow-hidden">
                      <div className="h-full rounded-full transition-all" style={{ width: `${(item.value / totalSpend) * 100}%`, backgroundColor: item.color }} />
                    </div>
                  </div>
                </div>
              ))}
            </Card>
          </div>
        </div>
      )}

      {spending.length > 0 && (
        <Card className="space-y-4">
          <h3 className="text-sm font-semibold">Weekly Spending Trend</h3>
          <GradientAreaChart data={weeklyTrend} dataKey="name" categories={["spending"]} colors={["#A855F7"]} height={250} />
        </Card>
      )}
    </div>
  );
}
