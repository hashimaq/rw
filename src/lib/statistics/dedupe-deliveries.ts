import type { DeliveryInput } from "@/lib/scoring-engine/types";

/**
 * Statistics use the same delivery replay as scorecards, with idempotent dedupe:
 * unique by clientEventId, then one row per sequence (last wins if corrupted).
 */
export function dedupeDeliveriesForStatistics(
  inputs: DeliveryInput[],
): DeliveryInput[] {
  const byClient = new Map<string, DeliveryInput>();
  for (const d of inputs) {
    byClient.set(d.clientEventId, d);
  }
  const bySequence = new Map<number, DeliveryInput>();
  for (const d of byClient.values()) {
    bySequence.set(d.sequenceInInnings, d);
  }
  return [...bySequence.values()].sort(
    (a, b) => a.sequenceInInnings - b.sequenceInInnings,
  );
}
