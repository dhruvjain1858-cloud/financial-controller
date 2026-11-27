import Link from "next/link";

/** Shown on account pages when the deployment has no Supabase project configured. */
export function AuthNotConfigured() {
  return (
    <div className="min-h-screen flex items-center justify-center p-6">
      <div className="max-w-md w-full rounded-2xl border border-border/60 bg-card/60 p-8 text-center space-y-4">
        <h1 className="text-2xl font-bold">Accounts are not set up here</h1>
        <p className="text-sm text-muted-foreground">
          This deployment has no sign-in service configured. You can still use Financial Controller:
          your data is saved in this browser.
        </p>
        <Link href="/" className="inline-block rounded-xl bg-primary px-5 py-2.5 text-sm font-medium text-white">
          Open the app
        </Link>
      </div>
    </div>
  );
}
