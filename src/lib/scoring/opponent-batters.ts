import type { DeliveryInput, InningsScoreState } from "@/lib/scoring-engine/types";

/** Match-level opponent batter names (no permanent DB). */
export function opponentBatterNamesFromDeliveries(
  deliveries: DeliveryInput[],
  state?: InningsScoreState,
): string[] {
  const seen = new Map<string, string>();

  const add = (playerId: string | null, name: string) => {
    if (playerId) return;
    const trimmed = name.trim();
    if (!trimmed) return;
    const key = trimmed.toLowerCase();
    if (!seen.has(key)) seen.set(key, trimmed);
  };

  for (const d of deliveries) {
    add(d.strikerPlayerId, d.strikerName);
    add(d.nonStrikerPlayerId, d.nonStrikerName);
    if (d.dismissedPlayerId === null && d.dismissedPlayerName) {
      add(null, d.dismissedPlayerName);
    }
  }

  if (state) {
    for (const b of Object.values(state.batters)) {
      if (!b.playerId) add(null, b.name);
    }
  }

  return [...seen.values()].sort((a, b) => a.localeCompare(b));
}
