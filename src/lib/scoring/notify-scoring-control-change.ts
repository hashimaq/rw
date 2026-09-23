import "server-only";
import {
  SCORING_CONTROL_BROADCAST_EVENT,
  type ScoringControlBroadcastPayload,
  scoringControlChannelName,
} from "@/lib/scoring/control-realtime";
import { createServiceRoleClient } from "@/lib/supabase/admin";

/** Fire-and-forget Realtime broadcast so scorer devices refresh session status immediately. */
export function notifyScoringControlChange(
  matchId: string,
  reason: ScoringControlBroadcastPayload["reason"],
): void {
  void (async () => {
    try {
      const supabase = createServiceRoleClient();
      const channel = supabase.channel(scoringControlChannelName(matchId), {
        config: { broadcast: { self: true } },
      });

      await new Promise<void>((resolve, reject) => {
        const timeout = setTimeout(() => {
          void supabase.removeChannel(channel);
          reject(new Error("broadcast subscribe timeout"));
        }, 4_000);

        channel.subscribe((status) => {
          if (status !== "SUBSCRIBED") return;
          clearTimeout(timeout);
          void channel
            .send({
              type: "broadcast",
              event: SCORING_CONTROL_BROADCAST_EVENT,
              payload: {
                match_id: matchId,
                reason,
              } satisfies ScoringControlBroadcastPayload,
            })
            .finally(() => {
              void supabase.removeChannel(channel);
              resolve();
            });
        });
      });
    } catch {
      /* Realtime is best-effort; session-status refresh on focus still applies. */
    }
  })();
}
