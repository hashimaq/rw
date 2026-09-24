import { undoLastDelivery } from "@/lib/scoring-engine/build-state";
import type { DeliveryInput, InningsScoreState } from "@/lib/scoring-engine/types";
import { participantKey } from "@/lib/scoring-engine/utils";
import { isCreaseCorrectionDelivery } from "@/lib/scoring/scoring-meta-delivery";

function isWicketReplacementCorrection(
  correction: DeliveryInput,
  previous: DeliveryInput,
): boolean {
  if (!previous.isWicket || previous.wicketType === "retired") return false;
  const replacementStrikerKey = participantKey(
    correction.strikerPlayerId,
    correction.strikerName,
  );
  const dismissedKey = participantKey(
    previous.dismissedPlayerId,
    previous.dismissedPlayerName ?? "",
  );
  return replacementStrikerKey !== dismissedKey;
}

/**
 * Undo the latest scorer event. When the latest event is a post-wicket replacement
 * crease correction, also undo the wicket so the innings returns to the pre-wicket state.
 */
export function undoLastScorerEvents(state: InningsScoreState): {
  next: InningsScoreState;
  removed: DeliveryInput[];
} | null {
  if (state.deliveries.length === 0) return null;

  const last = state.deliveries[state.deliveries.length - 1];
  let next = undoLastDelivery(state);
  if (!next) return null;
  const removed: DeliveryInput[] = [last];

  if (
    isCreaseCorrectionDelivery(last) &&
    next.deliveries.length > 0 &&
    isWicketReplacementCorrection(last, next.deliveries[next.deliveries.length - 1])
  ) {
    const wicketDelivery = next.deliveries[next.deliveries.length - 1];
    const afterWicketUndo = undoLastDelivery(next);
    if (afterWicketUndo) {
      next = afterWicketUndo;
      removed.push(wicketDelivery);
    }
  }

  return { next, removed };
}
