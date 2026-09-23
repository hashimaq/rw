import type { InningsScoreState } from "@/lib/scoring-engine/types";
import { lastBowlerKey } from "@/lib/scoring-engine/delivery-builders";
import { participantKey } from "@/lib/scoring-engine/utils";

export const CONSECUTIVE_OVER_BOWLER_MESSAGE =
  "This bowler cannot bowl consecutive overs.";

/** First ball of a new over (after a completed over). */
export function isStartOfNewOver(state: InningsScoreState): boolean {
  return state.legalBalls > 0 && state.legalBalls % 6 === 0;
}

export function bowlerKeyFromParts(
  playerId: string | null,
  name: string,
): string {
  return participantKey(playerId, name);
}

/**
 * After a completed over, the next over's bowler must differ from the
 * bowler who finished the previous over.
 */
export function validateConsecutiveOverBowler(
  stateBefore: InningsScoreState,
  bowlerPlayerId: string | null,
  bowlerName: string,
): string | null {
  if (!isStartOfNewOver(stateBefore)) return null;
  const forbidden = lastBowlerKey(stateBefore);
  if (!forbidden) return null;
  const incoming = bowlerKeyFromParts(bowlerPlayerId, bowlerName);
  if (incoming === forbidden) {
    return CONSECUTIVE_OVER_BOWLER_MESSAGE;
  }
  return null;
}
