import { applyDeliveryToState } from "@/lib/scoring-engine/build-state";
import type { DeliveryInput, InningsScoreState } from "@/lib/scoring-engine/types";
import { scoringApplyBase } from "@/lib/scoring/participants-from-state";

export type InningsDeliveryBuilder = (
  base: InningsScoreState,
  clientEventId: string,
) => DeliveryInput | null;

export interface CommitInningsDeliveryResult {
  next: InningsScoreState;
  delivery: DeliveryInput | null;
  /** True when this clientEventId was already applied (e.g. React Strict Mode re-run). */
  skippedDuplicate: boolean;
}

/**
 * Apply one delivery idempotently by clientEventId.
 * Prevents double scoring when a state updater runs twice with the same event id.
 */
export function commitInningsDeliveryUpdate(
  prev: InningsScoreState,
  refState: InningsScoreState,
  clientEventId: string,
  buildDelivery: InningsDeliveryBuilder,
  allowApply: (base: InningsScoreState, delivery: DeliveryInput) => boolean = () =>
    true,
): CommitInningsDeliveryResult {
  const onRef = refState.deliveries.find(
    (d) => d.clientEventId === clientEventId,
  );
  if (onRef) {
    return { next: refState, delivery: onRef, skippedDuplicate: true };
  }

  if (prev.deliveries.some((d) => d.clientEventId === clientEventId)) {
    return { next: prev, delivery: null, skippedDuplicate: true };
  }

  const base = scoringApplyBase(prev, refState);
  const delivery = buildDelivery(base, clientEventId);
  if (!delivery) {
    return { next: prev, delivery: null, skippedDuplicate: false };
  }

  if (delivery.clientEventId !== clientEventId) {
    throw new Error("Delivery clientEventId must match commit id");
  }

  if (!allowApply(base, delivery)) {
    return { next: prev, delivery: null, skippedDuplicate: false };
  }

  const next = applyDeliveryToState(base, delivery);
  return { next, delivery, skippedDuplicate: false };
}
