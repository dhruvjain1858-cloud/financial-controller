"use client";

import { ReactNode } from "react";
import { FinancialProvider } from "@/context/FinancialContext";
import { Sidebar } from "@/components/Sidebar";
import { Navbar } from "@/components/Navbar";
import { OnboardingFlow } from "@/components/modals/OnboardingFlow";
import { usePathname } from "next/navigation";

export function AppShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const isAuthPage = pathname === "/auth";

  return (
    <FinancialProvider>
      {!isAuthPage && <OnboardingFlow />}
      <div className="fixed inset-0 z-[-1] bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-blue-900/20 via-background to-background" />
      
      {!isAuthPage && <Sidebar />}
      
      <div className={isAuthPage ? "w-full" : "md:ml-64 flex-1 flex flex-col min-h-screen pb-16 md:pb-0"}>
        {!isAuthPage && <Navbar />}
        <main className={isAuthPage ? "w-full" : "flex-1 p-4 md:p-8 z-10 max-w-7xl mx-auto w-full"}>
          {children}
        </main>
      </div>
    </FinancialProvider>
  );
}
