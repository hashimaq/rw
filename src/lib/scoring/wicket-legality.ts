import type { ExtraType, WicketType } from "@/lib/database/types";

/**
 * MCC Law 21.18 — on a No Ball, batters may only be out Run out,
 * Obstructing the field, or Hit the ball twice (not modeled separately).
 */
const WICKET_TYPES_ALLOWED_ON_NO_BALL: ReadonlySet<WicketType> = new Set([
  "run_out",
  "other",
  "retired",
]);

/** MCC Law 22 — Wide; run out is the common dismissal on completed wide runs. */
const WICKET_TYPES_ALLOWED_ON_WIDE: ReadonlySet<WicketType> = new Set([
  "run_out",
  "other",
  "retired",
]);

export function isWicketTypeAllowedOnExtra(
  wicketType: WicketType,
  extraType: ExtraType,
): boolean {
  if (extraType === "none" || extraType === "bye" || extraType === "leg_bye") {
    return true;
  }
  if (extraType === "no_ball") {
    return WICKET_TYPES_ALLOWED_ON_NO_BALL.has(wicketType);
  }
  if (extraType === "wide") {
    return WICKET_TYPES_ALLOWED_ON_WIDE.has(wicketType);
  }
  if (extraType === "penalty") {
    return false;
  }
  return true;
}

export function wicketOnExtraRejectionMessage(
  wicketType: WicketType,
  extraType: ExtraType,
): string {
  return `Wicket type "${wicketType}" is not permitted on a ${extraType.replace("_", " ")} delivery (MCC Laws 21.18 / 22).`;
}
