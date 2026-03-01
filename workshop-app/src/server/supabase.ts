import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { env } from "workshop/env";

export const STORAGE_BUCKET = "documents";

/**
 * Server-only Supabase client with service role key.
 * Use for uploads and admin operations (bypasses RLS).
 * Never expose this client or the service role key to the browser.
 * Returns null if Supabase env vars are not set (upload will fail with a clear message).
 */
export function getSupabaseAdmin(): SupabaseClient | null {
  if (!env.SUPABASE_URL || !env.SUPABASE_SERVICE_ROLE_KEY) return null;
  return createClient(
    env.SUPABASE_URL,
    env.SUPABASE_SERVICE_ROLE_KEY,
    { auth: { persistSession: false } }
  );
}
