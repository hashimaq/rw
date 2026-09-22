import "server-only";
import { createClient } from "@supabase/supabase-js";

/**
 * Verifies the account password without altering the caller's session cookies.
 * Uses a throwaway anon client (persistSession: false).
 */
export async function verifyAccountPassword(
  email: string,
  password: string,
): Promise<boolean> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anonKey) {
    throw new Error("Auth is not configured");
  }

  const probe = createClient(url, anonKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { error } = await probe.auth.signInWithPassword({ email, password });
  return !error;
}
