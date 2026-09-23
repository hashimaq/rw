import type { DeliveryInput } from "@/lib/scoring-engine/types";
import type { ParticipantRef } from "@/lib/scoring/participant";

/** Name-only opponent with a stable id for deliveries and React keys. */
export function createOpponentParticipant(name: string): ParticipantRef {
  const trimmed = name.trim().replace(/\s+/g, " ");
  return { playerId: crypto.randomUUID(), name: trimmed };
}

export function createOpponentBowler(name: string): ParticipantRef {
  return createOpponentParticipant(name);
}

/**
 * Rebuild opponent batter refs from deliveries (stable ids for name-only players).
 */
export function opponentParticipantsFromDeliveries(
  deliveries: DeliveryInput[],
): ParticipantRef[] {
  const refs = new Map<string, ParticipantRef>();

  const track = (playerId: string | null, name: string, anchorId: string) => {
    const trimmed = name.trim();
    if (!trimmed) return;
    const id = playerId ?? anchorId;
    const key = `player:${id}`;
    if (!refs.has(key)) {
      refs.set(key, { playerId: id, name: trimmed });
    }
  };

  for (const d of deliveries) {
    track(d.strikerPlayerId, d.strikerName, d.clientEventId);
    track(d.nonStrikerPlayerId, d.nonStrikerName, d.clientEventId);
    if (d.dismissedPlayerName) {
      track(d.dismissedPlayerId, d.dismissedPlayerName, d.clientEventId);
    }
  }

  return [...refs.values()].sort((a, b) => a.name.localeCompare(b.name));
}
