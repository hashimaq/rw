import { decodeNoBallRunKind } from "./no-ball-run-kind";
import type { DeliveryInput } from "./types";
import {
  isWicketTypeAllowedOnExtra,
  wicketOnExtraRejectionMessage,
} from "@/lib/scoring/wicket-legality";

/**
 * Explicit run attribution for a delivery (MCC Laws 18, 21, 22, 23).
 * Derived from persisted fields — single source for accounting checks.
 */
export interface DeliveryRunComponents {
  batterRuns: number;
  /** No-ball penalty run(s); 1 per no-ball delivery when scored. */
  noBallRuns: number;
  /** All wide runs (penalty + completed), credited as wides extra. */
  wideRuns: number;
  byeRuns: number;
  legByeRuns: number;
  penaltyRuns: number;
  /** Sum of all non-batter runs on this delivery. */
  extrasRuns: number;
  totalRuns: number;
}

export function deliveryRunComponents(
  delivery: DeliveryInput,
): DeliveryRunComponents {
  const batterRuns = delivery.batterRuns;
  let noBallRuns = 0;
  let wideRuns = 0;
  let byeRuns = 0;
  let legByeRuns = 0;
  let penaltyRuns = 0;

  switch (delivery.extraType) {
    case "wide":
      wideRuns = delivery.extrasRuns;
      break;
    case "no_ball": {
      noBallRuns = 1;
      const kind = decodeNoBallRunKind(delivery);
      const additional = Math.max(delivery.totalRuns - 1, 0);
      if (kind === "bye") byeRuns = additional;
      else if (kind === "leg_bye") legByeRuns = additional;
      break;
    }
    case "bye":
      byeRuns = delivery.extrasRuns;
      break;
    case "leg_bye":
      legByeRuns = delivery.extrasRuns;
      break;
    case "penalty":
      penaltyRuns = delivery.extrasRuns;
      break;
    default:
      break;
  }

  const extrasRuns =
    noBallRuns + wideRuns + byeRuns + legByeRuns + penaltyRuns;
  const totalRuns = batterRuns + extrasRuns;

  return {
    batterRuns,
    noBallRuns,
    wideRuns,
    byeRuns,
    legByeRuns,
    penaltyRuns,
    extrasRuns,
    totalRuns,
  };
}

/** Throws if delivery fields contradict cricket accounting rules. */
export function assertDeliveryRunInvariant(delivery: DeliveryInput): void {
  const c = deliveryRunComponents(delivery);
  if (c.totalRuns !== delivery.totalRuns) {
    throw new Error(
      `Delivery ${delivery.clientEventId}: component total ${c.totalRuns} !== totalRuns ${delivery.totalRuns}`,
    );
  }

  if (c.batterRuns + c.extrasRuns !== c.totalRuns) {
    throw new Error(
      `Delivery ${delivery.clientEventId}: batterRuns + extrasRuns must equal totalRuns`,
    );
  }

  if (delivery.extrasRuns !== c.extrasRuns) {
    throw new Error(
      `Delivery ${delivery.clientEventId}: extrasRuns field ${delivery.extrasRuns} !== component extras ${c.extrasRuns}`,
    );
  }

  if (delivery.extraType === "wide" && delivery.batterRuns !== 0) {
    throw new Error("Wide delivery cannot credit batterRuns");
  }

  if (delivery.extraType === "no_ball") {
    if (c.noBallRuns !== 1 && delivery.totalRuns > 0) {
      throw new Error("No-ball delivery must include exactly one no-ball penalty run");
    }
    const kind = decodeNoBallRunKind(delivery);
    if (kind === "bat" && delivery.batterRuns !== c.totalRuns - 1) {
      throw new Error("No-ball off the bat: batterRuns must equal totalRuns - 1");
    }
    if ((kind === "bye" || kind === "leg_bye" || kind === "none") && delivery.batterRuns !== 0) {
      throw new Error("No-ball bye/leg-bye/none cannot credit batterRuns");
    }
  }

  if (delivery.extraType === "bye" && delivery.batterRuns !== 0) {
    throw new Error("Bye delivery cannot credit batterRuns");
  }

  if (delivery.extraType === "leg_bye" && delivery.batterRuns !== 0) {
    throw new Error("Leg-bye delivery cannot credit batterRuns");
  }

  if (
    delivery.isWicket &&
    delivery.wicketType &&
    !isWicketTypeAllowedOnExtra(delivery.wicketType, delivery.extraType)
  ) {
    throw new Error(
      wicketOnExtraRejectionMessage(delivery.wicketType, delivery.extraType),
    );
  }
}

/** Runs that change ends on a no-ball (excludes the mandatory penalty). Law 21.16 / 18. */
export function noBallCompletedRuns(delivery: DeliveryInput): number {
  if (delivery.extraType !== "no_ball") return 0;
  const c = deliveryRunComponents(delivery);
  return c.batterRuns + c.byeRuns + c.legByeRuns;
}

/** Completed wide runs beyond the mandatory 1-run wide penalty. */
export function wideAdditionalRuns(delivery: DeliveryInput): number {
  if (delivery.extraType !== "wide") return 0;
  return Math.max(delivery.totalRuns - 1, 0);
}
