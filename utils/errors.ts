/** Message from an unknown thrown value (Supabase AuthError, Error, string, ...). */
export function errorMessage(err: unknown, fallback = "Something went wrong."): string {
  if (err instanceof Error && err.message) return err.message;
  if (typeof err === "string" && err) return err;
  if (err && typeof err === "object" && "message" in err && typeof err.message === "string") return err.message;
  return fallback;
}

export function errorName(err: unknown): string | undefined {
  return err && typeof err === "object" && "name" in err && typeof err.name === "string" ? err.name : undefined;
}
