import { deliveryRowToInput } from "@/lib/mappers/delivery";
import type { Delivery } from "@/lib/database/types";
import { buildInningsStateFromDeliveries } from "@/lib/scoring-engine";
import type { DeliveryInput } from "@/lib/scoring-engine/types";
import { validateConsecutiveOverBowler } from "@/lib/scoring/bowler-consecutive-overs";

export function validateIncomingDeliveryAgainstState(
  stateBefore: ReturnType<typeof buildInningsStateFromDeliveries>,
  incoming: DeliveryInput,
): string | null {
  return validateConsecutiveOverBowler(
    stateBefore,
    incoming.bowlerPlayerId,
    incoming.bowlerName,
  );
}

export function buildInningsStateBeforeIncomingDelivery(
  existingRows: Delivery[],
  oversLimit: number,
  target: number | null,
  incomingClientEventId: string,
  incomingSequenceInInnings: number,
): ReturnType<typeof buildInningsStateFromDeliveries> {
  const inputs = existingRows
    .filter((r) => r.client_event_id !== incomingClientEventId)
    .filter((r) => r.sequence_in_innings < incomingSequenceInInnings)
    .map((r) => deliveryRowToInput(r as Delivery));
  return buildInningsStateFromDeliveries(inputs, oversLimit, target);
}
