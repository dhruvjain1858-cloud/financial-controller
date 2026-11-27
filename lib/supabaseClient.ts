import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";

/**
 * True when both public Supabase env vars are set. Without them the app runs in
 * local-only mode: data stays in this browser and sign-in is unavailable.
 * (The anon key is designed to be public; data is protected by Row Level Security.)
 */
export const isSupabaseConfigured = Boolean(supabaseUrl && supabaseAnonKey);

// createClient throws on an empty URL, which would crash every page at import time.
// A placeholder keeps local-only mode working; no request is made while unconfigured.
export const supabase = createClient(
  isSupabaseConfigured ? supabaseUrl : "http://localhost:54321",
  isSupabaseConfigured ? supabaseAnonKey : "local-only-mode"
);
