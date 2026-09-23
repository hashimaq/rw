import type { ActiveParticipants } from "@/lib/scoring-engine/delivery-builders";
import type { InningsScoreState } from "@/lib/scoring-engine/types";
import type { ParticipantRef } from "@/lib/scoring/participant";

/** Prefer the innings snapshot that already includes the latest committed delivery. */
export function scoringApplyBase(
  reactState: InningsScoreState,
  refState: InningsScoreState,
): InningsScoreState {
  return refState.deliveries.length > reactState.deliveries.length
    ? refState
    : reactState;
}

function participantsFromRefs(
  striker: ParticipantRef,
  nonStriker: ParticipantRef,
  bowler: ParticipantRef,
): ActiveParticipants {
  return {
    strikerPlayerId: striker.playerId,
    strikerName: striker.name,
    nonStrikerPlayerId: nonStriker.playerId,
    nonStrikerName: nonStriker.name,
    bowlerPlayerId: bowler.playerId,
    bowlerName: bowler.name,
  };
}

/**
 * Crease participants for the next delivery — always from engine keys, not React hooks.
 * Hooks can lag one frame behind stateRef after applyDeliveryToState.
 */
export function activeParticipantsForNextDelivery(
  state: InningsScoreState,
  bowler: ParticipantRef,
  hookFallback: { striker: ParticipantRef; nonStriker: ParticipantRef } | null,
): ActiveParticipants | null {
  const sk = state.strikerKey;
  const nsk = state.nonStrikerKey;
  if (sk && nsk) {
    const s = state.batters[sk];
    const ns = state.batters[nsk];
    if (s && ns && !s.isOut && !ns.isOut) {
      return {
        strikerPlayerId: s.playerId,
        strikerName: s.name,
        nonStrikerPlayerId: ns.playerId,
        nonStrikerName: ns.name,
        bowlerPlayerId: bowler.playerId,
        bowlerName: bowler.name,
      };
    }
  }
  if (hookFallback) {
    return participantsFromRefs(
      hookFallback.striker,
      hookFallback.nonStriker,
      bowler,
    );
  }
  return null;
}
