import type { DeliveryInput } from "./types";

const NOTE_PREFIX = "no_ball_run_kind:";

export function encodeNoBallRunKindNote(
  kind: DeliveryInput["noBallRunKind"],
): string | null {
  if (!kind || kind === "bat" || kind === "none") return null;
  return `${NOTE_PREFIX}${kind}`;
}

export function decodeNoBallRunKind(
  delivery: Pick<
    DeliveryInput,
    "extraType" | "noBallRunKind" | "notes" | "batterRuns"
  >,
): DeliveryInput["noBallRunKind"] {
  if (delivery.extraType !== "no_ball") return undefined;
  if (delivery.noBallRunKind) return delivery.noBallRunKind;
  const note = delivery.notes?.trim() ?? "";
  if (note.startsWith(NOTE_PREFIX)) {
    const raw = note.slice(NOTE_PREFIX.length);
    if (raw === "bye" || raw === "leg_bye" || raw === "none") return raw;
  }
  if (delivery.batterRuns > 0) return "bat";
  return "none";
}
