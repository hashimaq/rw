import { validateConsecutiveOverBowler } from "@/lib/scoring/bowler-consecutive-overs";
import type { DeliveryInput, InningsScoreState } from "@/lib/scoring-engine/types";

/**
 * Whether incoming delivery must pass consecutive-over bowler validation.
 * Crease corrections often still reference the bowler who finished the last over
 * while only batters change; the next-over bowler is chosen in need_bowler.
 */
export function deliveryRequiresConsecutiveOverCheck(
  delivery: DeliveryInput,
): boolean {
  return delivery.notes !== "crease_correction";
}

export function allowDeliveryAgainstConsecutiveOverRule(
  stateBefore: InningsScoreState,
  delivery: DeliveryInput,
): boolean {
  if (!deliveryRequiresConsecutiveOverCheck(delivery)) return true;
  return (
    validateConsecutiveOverBowler(
      stateBefore,
      delivery.bowlerPlayerId,
      delivery.bowlerName,
    ) == null
  );
}
