import {
  noBallCompletedRuns,
  wideAdditionalRuns,
} from "./delivery-run-components";
import { isScoringMetaDelivery } from "@/lib/scoring/scoring-meta-delivery";
import type { DeliveryInput } from "./types";

/** True when delivery should not affect score or strike. */
export function isDeadBallDelivery(delivery: DeliveryInput): boolean {
  if (isScoringMetaDelivery(delivery)) return true;
  return (
    delivery.totalRuns === 0 &&
    !delivery.isLegalDelivery &&
    delivery.extraType === "none" &&
    !delivery.isWicket
  );
}

/** Additional runs taken on a no-ball (excludes the mandatory 1-run penalty). */
export function noBallAdditionalRuns(delivery: DeliveryInput): number {
  return noBallCompletedRuns(delivery);
}

/**
 * Runs that determine strike change for this delivery.
 * Normal / bye / leg-bye: odd totalRuns → swap.
 * Wide / no-ball: odd additional runs only (mandatory penalty excluded) → swap.
 */
export function deliveryRunsForStrikeChange(delivery: DeliveryInput): number {
  if (isDeadBallDelivery(delivery)) return 0;
  if (delivery.extraType === "no_ball") {
    return noBallAdditionalRuns(delivery);
  }
  if (delivery.extraType === "wide") {
    return wideAdditionalRuns(delivery);
  }
  return delivery.totalRuns;
}

export function shouldSwapStrikeForDelivery(delivery: DeliveryInput): boolean {
  const runs = deliveryRunsForStrikeChange(delivery);
  return runs % 2 === 1;
}
