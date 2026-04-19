"use client";

import { ReactNode } from "react";
import { FinancialProvider } from "@/context/FinancialContext";
import { Sidebar } from "@/components/Sidebar";
import { Navbar } from "@/components/Navbar";
import { OnboardingFlow } from "@/components/modals/OnboardingFlow";

export function AppShell({ children }: { children: ReactNode }) {
  return (
    <FinancialProvider>
      <OnboardingFlow />
      <div className="fixed inset-0 z-[-1] bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-blue-900/20 via-background to-background" />
      <Sidebar />
      <div className="md:ml-64 flex-1 flex flex-col min-h-screen pb-16 md:pb-0">
        <Navbar />
        <main className="flex-1 p-4 md:p-8 z-10 max-w-7xl mx-auto w-full">
          {children}
        </main>
      </div>
    </FinancialProvider>
  );
}
