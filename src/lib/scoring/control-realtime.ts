/** Supabase Realtime broadcast channel for scoring-control signals (no secrets in payload). */

export const SCORING_CONTROL_BROADCAST_EVENT = "scoring_control";

export type ScoringControlBroadcastPayload = {
  match_id: string;
  /** Hint for clients to refresh session status from the server. */
  reason:
    | "transfer_requested"
    | "transfer_responded"
    | "transfer_cancelled"
    | "controller_changed";
};

export function scoringControlChannelName(matchId: string): string {
  return `rw-scoring-control:${matchId}`;
}
