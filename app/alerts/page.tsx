"use client";

import { AlertBanner } from "@/components/AlertBanner";
import { useFinancial } from "@/context/FinancialContext";
import { generateAlerts } from "@/utils/calculations";
import { ShieldAlert } from "lucide-react";
import { Card } from "@/components/Card";

export default function AlertsPage() {
  const { state } = useFinancial();
  const alerts = generateAlerts(state);

  return (
    <div className="space-y-6 max-w-4xl">
      <div className="space-y-1">
        <h1 className="text-2xl md:text-3xl font-bold tracking-tight">Alerts & Notifications</h1>
        <p className="text-muted-foreground text-sm">Actionable insights requiring your attention.</p>
      </div>

      {alerts.length === 0 ? (
        <Card className="flex flex-col items-center justify-center py-16 text-center">
          <ShieldAlert className="w-12 h-12 text-muted-foreground/30 mb-4" />
          <h3 className="font-semibold text-lg mb-1">All clear!</h3>
          <p className="text-muted-foreground text-sm">No alerts right now. Your finances look healthy.</p>
        </Card>
      ) : (
        <div className="space-y-3">
          {alerts.map((alert) => (
            <AlertBanner key={alert.id} type={alert.type} title={alert.title} description={alert.description} />
          ))}
        </div>
      )}
    </div>
  );
}
