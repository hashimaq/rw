import type { DeliveryInputPayload } from "@/lib/validation/delivery";

/** Scoring meta rows are not ball-by-ball commentary events. */
export function shouldGenerateDeliveryCommentary(
  payload: DeliveryInputPayload,
): boolean {
  const notes = payload.notes?.trim();
  if (notes === "crease_correction" || notes === "dead_ball") return false;
  return true;
}
