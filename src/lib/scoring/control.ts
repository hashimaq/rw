import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/database/types";

export type ScoringControlRole = "none" | "controller" | "viewer";

export async function findActiveControllerSession(
  supabase: SupabaseClient<Database>,
  matchId: string,
) {
  const { data, error } = await supabase
    .from("scoring_sessions")
    .select("id, device_label, started_at, last_seen_at")
    .eq("match_id", matchId)
    .eq("status", "active")
    .eq("is_scoring_controller", true)
    .is("ended_at", null)
    .maybeSingle();

  if (error) throw error;
  return data;
}

export async function findPendingTransferForSession(
  supabase: SupabaseClient<Database>,
  matchId: string,
  sessionId: string,
  isController: boolean,
) {
  if (isController) {
    const { data, error } = await supabase
      .from("scoring_control_transfers")
      .select("id, requesting_session_id, created_at")
      .eq("match_id", matchId)
      .eq("status", "pending")
      .eq("controller_session_id", sessionId)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (error) throw error;
    return data
      ? { id: data.id, direction: "incoming" as const }
      : null;
  }

  const { data, error } = await supabase
    .from("scoring_control_transfers")
    .select("id, created_at")
    .eq("match_id", matchId)
    .eq("status", "pending")
    .eq("requesting_session_id", sessionId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw error;
  return data ? { id: data.id, direction: "outgoing" as const } : null;
}
