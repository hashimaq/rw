import type { DeliveryInput } from "@/lib/scoring-engine/types";
import { participantKey } from "@/lib/scoring-engine/utils";
import type { ParticipantRef } from "@/lib/scoring/participant";
import { isScoringMetaDelivery } from "@/lib/scoring/scoring-meta-delivery";

/** Opponent bowler names seen this innings (local, no network). @deprecated use opponentBowlersFromDeliveries */
export function opponentBowlerNamesFromDeliveries(
  deliveries: DeliveryInput[],
): string[] {
  return opponentBowlersFromDeliveries(deliveries).map((b) => b.name);
}

/**
 * Unique opponent bowlers from this innings' delivery history (legal overs + meta corrections).
 * Stable keys; name normalization for manual entries.
 */
export function opponentBowlersFromDeliveries(
  deliveries: DeliveryInput[],
): ParticipantRef[] {
  const seen = new Map<string, ParticipantRef>();
  for (const d of deliveries) {
    if (d.isLegalDelivery || isScoringMetaDelivery(d)) {
      const trimmed = d.bowlerName.trim();
      if (!trimmed) continue;
      const key = participantKey(d.bowlerPlayerId, trimmed);
      if (!seen.has(key)) {
        seen.set(key, { playerId: d.bowlerPlayerId, name: trimmed });
      }
    }
  }
  return [...seen.values()].sort((a, b) => a.name.localeCompare(b.name));
}
