import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/database/types";
import {
  insertScoringSession,
  markMatchLiveIfSetup,
} from "@/lib/scoring/establish-session";

/** First scorer for a newly created match: controller session + live transition. */
export async function grantCreatorScoringController(
  supabase: SupabaseClient<Database>,
  matchId: string,
  matchStatus: string,
): Promise<{ sessionId: string; token: string }> {
  const { sessionId, token } = await insertScoringSession(
    supabase,
    matchId,
    null,
    { isScoringController: true },
  );
  await markMatchLiveIfSetup(supabase, matchId, matchStatus);
  return { sessionId, token };
}
