import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { hashSessionToken } from "@/lib/auth/scorer-pin";
import type { Database } from "@/lib/database/types";

export async function findActiveScoringSessions(
  supabase: SupabaseClient<Database>,
  matchId: string,
) {
  const { data, error } = await supabase
    .from("scoring_sessions")
    .select("id, device_label, started_at")
    .eq("match_id", matchId)
    .eq("status", "active")
    .is("ended_at", null);

  if (error) throw error;
  return data ?? [];
}

export async function markMatchLiveIfSetup(
  supabase: SupabaseClient<Database>,
  matchId: string,
  currentStatus: string,
): Promise<void> {
  if (currentStatus !== "setup") return;
  await supabase
    .from("matches")
    .update({
      status: "live",
      started_at: new Date().toISOString(),
    })
    .eq("id", matchId);
}

export async function insertScoringSession(
  supabase: SupabaseClient<Database>,
  matchId: string,
  deviceLabel?: string | null,
  options?: { isScoringController?: boolean },
): Promise<{ sessionId: string; token: string }> {
  const sessionToken = crypto.randomUUID();
  const tokenHash = hashSessionToken(sessionToken);

  const { data: session, error: sessionError } = await supabase
    .from("scoring_sessions")
    .insert({
      match_id: matchId,
      session_token_hash: tokenHash,
      device_label: deviceLabel ?? null,
      status: "active",
      is_scoring_controller: options?.isScoringController ?? false,
    })
    .select("id")
    .single();

  if (sessionError || !session) {
    const duplicateController =
      sessionError?.code === "23505" &&
      (options?.isScoringController ?? false);
    if (duplicateController) {
      const err = new Error("controller_already_assigned");
      (err as Error & { code: string }).code = "controller_already_assigned";
      throw err;
    }
    throw new Error("Could not start scoring session");
  }

  return { sessionId: session.id, token: sessionToken };
}
