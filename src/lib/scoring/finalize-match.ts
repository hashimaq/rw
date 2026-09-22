import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/database/types";

/** Mark match completed and end active scoring sessions (no PIN — server authority). */
export async function finalizeMatchIfNeeded(
  supabase: SupabaseClient<Database>,
  matchId: string,
  sessionId: string | null,
): Promise<{ completed: boolean }> {
  const { data: match, error: matchError } = await supabase
    .from("matches")
    .select("id, status")
    .eq("id", matchId)
    .maybeSingle();

  if (matchError || !match) {
    throw new Error("Match not found");
  }

  if (match.status === "completed" || match.status === "abandoned") {
    return { completed: false };
  }

  const now = new Date().toISOString();

  const { error: updateError } = await supabase
    .from("matches")
    .update({
      status: "completed",
      completed_at: now,
    })
    .eq("id", matchId)
    .in("status", ["setup", "live"]);

  if (updateError) {
    throw new Error("Could not finalize match");
  }

  if (sessionId) {
    await supabase
      .from("scoring_sessions")
      .update({
        status: "ended",
        ended_at: now,
      })
      .eq("id", sessionId)
      .eq("status", "active");
  } else {
    await supabase
      .from("scoring_sessions")
      .update({
        status: "ended",
        ended_at: now,
      })
      .eq("match_id", matchId)
      .eq("status", "active");
  }

  return { completed: true };
}

/** Two-innings limited-overs: complete match after innings 2 ends. */
export function shouldAutoCompleteMatchAfterInnings(
  inningsNumber: number,
): boolean {
  return inningsNumber >= 2;
}
