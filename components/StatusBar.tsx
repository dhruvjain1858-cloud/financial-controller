"use client";

import { useFinancial } from "@/context/FinancialContext";

const LABEL = {
  local: "Saved in this browser only",
  loading: "Loading your data...",
  syncing: "Saving...",
  synced: "Saved to your account",
  error: "Not saved to your account",
} as const;

/** Shows where data is stored, sync failures (with retry) and rejected input. */
export function StatusBar() {
  const { syncStatus, syncError, retrySync, actionError, clearActionError } = useFinancial();
  return (
    <div className="space-y-2 mb-4" aria-live="polite">
      {actionError && (
        <div role="alert" data-testid="action-error" className="flex justify-between gap-3 rounded-lg border border-danger/30 bg-danger/10 px-3 py-2 text-sm text-danger">
          <span>Not saved: {actionError}</span>
          <button onClick={clearActionError} className="font-medium underline">Dismiss</button>
        </div>
      )}
      {syncStatus === "error" && (
        <div role="alert" className="flex justify-between gap-3 rounded-lg border border-warning/30 bg-warning/10 px-3 py-2 text-sm text-warning">
          <span>{LABEL.error}{syncError ? `: ${syncError}` : ""}. Your changes are kept in this browser.</span>
          <button onClick={retrySync} className="font-medium underline">Retry</button>
        </div>
      )}
      <p data-testid="sync-status" className="text-xs text-muted-foreground text-right">{LABEL[syncStatus]}</p>
    </div>
  );
}
