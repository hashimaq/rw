import type { DeliveryInput } from "@/lib/scoring-engine/types";

/** Opponent bowler names seen this innings (local, no network). */
export function opponentBowlerNamesFromDeliveries(
  deliveries: DeliveryInput[],
): string[] {
  const seen = new Map<string, string>();
  for (const d of deliveries) {
    if (d.bowlerPlayerId) continue;
    const trimmed = d.bowlerName.trim();
    if (!trimmed) continue;
    const key = trimmed.toLowerCase();
    if (!seen.has(key)) seen.set(key, trimmed);
  }
  return [...seen.values()].sort((a, b) => a.localeCompare(b));
}
