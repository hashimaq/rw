import type { DeliveryInput } from "@/lib/scoring-engine/types";

/** Non-scoring deliveries persisted for scorer control / replay only. */
export function isScoringMetaDelivery(delivery: DeliveryInput): boolean {
  return (
    delivery.notes === "dead_ball" || delivery.notes === "crease_correction"
  );
}

export function isCreaseCorrectionDelivery(delivery: DeliveryInput): boolean {
  return delivery.notes === "crease_correction";
}
