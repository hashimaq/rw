import type { DeliveryInputPayload } from "@/lib/validation/delivery";

function idOrNull(
  id: string | null | undefined,
  known: Set<string>,
): string | null {
  if (!id) return null;
  return known.has(id) ? id : null;
}

/**
 * Deliveries reference players(id). Opponent name-only batters use synthetic UUIDs
 * that are not in the squad; null those IDs and keep *_name text for persistence.
 */
export function sanitizeDeliveryPlayerIds(
  payload: DeliveryInputPayload,
  knownPlayerIds: Set<string>,
): DeliveryInputPayload {
  return {
    ...payload,
    striker_player_id: idOrNull(payload.striker_player_id, knownPlayerIds),
    non_striker_player_id: idOrNull(
      payload.non_striker_player_id,
      knownPlayerIds,
    ),
    bowler_player_id: idOrNull(payload.bowler_player_id, knownPlayerIds),
    dismissed_player_id: idOrNull(payload.dismissed_player_id, knownPlayerIds),
    fielder_player_id: idOrNull(payload.fielder_player_id, knownPlayerIds),
  };
}
