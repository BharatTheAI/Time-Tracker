import { createClient } from "@supabase/supabase-js";
import type { Database } from "../types/database.types";

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL as string;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY as string;

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  throw new Error(
    "Missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY. Copy .env.example to .env and fill in your project values.",
  );
}

// persistSession + autoRefreshToken keep the JWT valid across
// refreshes; the actual access-control boundary is still RLS on the
// backend, this just avoids forcing re-login every hour.
export const supabase = createClient<Database>(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: false,
  },
});

/** Base URL for invoking Edge Functions directly via fetch (used where supabase.functions.invoke needs raw Blob responses, e.g. exports). */
export const FUNCTIONS_URL = `${SUPABASE_URL}/functions/v1`;
