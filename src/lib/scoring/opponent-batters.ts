import type { DeliveryInput, InningsScoreState } from "@/lib/scoring-engine/types";
import { opponentParticipantsFromDeliveries } from "@/lib/scoring/opponent-participant";

/** Match-level opponent batter names (no permanent DB). */
export function opponentBatterNamesFromDeliveries(
  deliveries: DeliveryInput[],
  _state?: InningsScoreState,
): string[] {
  return opponentParticipantsFromDeliveries(deliveries).map((p) => p.name);
}
