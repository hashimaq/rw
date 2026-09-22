import type { WicketType } from "@/lib/database/types";
import { participantKey } from "@/lib/scoring-engine/utils";
import type { ParticipantRef } from "@/lib/scoring/participant";

export const STRIKER_AUTO_DISMISSAL_TYPES: ReadonlySet<WicketType> = new Set([
  "bowled",
  "caught",
  "lbw",
  "hit_wicket",
  "stumped",
]);

export function isStrikerAutoDismissal(wicketType: WicketType): boolean {
  return STRIKER_AUTO_DISMISSAL_TYPES.has(wicketType);
}

export function requiresDismissedBatsmanSelection(
  wicketType: WicketType,
): boolean {
  return wicketType === "run_out" || wicketType === "retired" || wicketType === "other";
}

export function requiresFielder(wicketType: WicketType): boolean {
  return wicketType === "caught" || wicketType === "run_out" || wicketType === "stumped";
}

export function fielderRequiredMessage(wicketType: WicketType): string {
  if (wicketType === "caught") {
    return "Fielder name is required for a caught dismissal.";
  }
  if (wicketType === "run_out") {
    return "Fielder name is required for a run out.";
  }
  if (wicketType === "stumped") {
    return "Wicketkeeper name is required for a stumping.";
  }
  return "Fielder name is required.";
}

export function dismissedBatsmanRequiredMessage(): string {
  return "Select which batsman was run out.";
}

export interface WicketConfirmPayload {
  wicketType: WicketType;
  dismissed: ParticipantRef;
  fielder?: ParticipantRef | null;
  batterRuns?: number;
}

export function validateWicketConfirm(
  payload: WicketConfirmPayload,
): string | null {
  const fielderName = payload.fielder?.name?.trim() ?? "";
  if (requiresFielder(payload.wicketType) && !fielderName) {
    return fielderRequiredMessage(payload.wicketType);
  }
  if (!payload.dismissed?.name?.trim()) {
    if (payload.wicketType === "run_out") {
      return dismissedBatsmanRequiredMessage();
    }
    return "Dismissed batter is required.";
  }
  return null;
}

/** Authoritative striker for auto-dismissal wickets (from engine crease sync). */
export function dismissedStrikerForAutoWicket(
  striker: ParticipantRef | null,
): ParticipantRef | null {
  if (!striker?.name?.trim()) return null;
  return striker;
}

/** Resolve dismissed batter from engine crease + scorer input (run out / retired / other). */
export function resolveWicketDismissed(
  wicketType: WicketType,
  engineStriker: ParticipantRef | null,
  engineNonStriker: ParticipantRef | null,
  scorerDismissed: ParticipantRef,
): ParticipantRef | null {
  if (isStrikerAutoDismissal(wicketType)) {
    return dismissedStrikerForAutoWicket(engineStriker);
  }
  const key = participantKey(
    scorerDismissed.playerId,
    scorerDismissed.name.trim(),
  );
  const atCrease = [engineStriker, engineNonStriker].filter(Boolean) as ParticipantRef[];
  return (
    atCrease.find(
      (b) => participantKey(b.playerId, b.name) === key,
    ) ?? null
  );
}
