import type { DeliveryInput } from "./types";

export function deliveryChipTone(
  d: DeliveryInput,
): "wicket" | "boundary" | "six" | "extra" | "neutral" {
  if (d.notes === "dead_ball") return "extra";
  if (d.isWicket) return "wicket";
  if (d.extraType !== "none") return "extra";
  if (d.batterRuns === 6 || d.isSix) return "six";
  if (d.batterRuns === 4 || d.isBoundary) return "boundary";
  return "neutral";
}

export function deliveryChipClassName(tone: ReturnType<typeof deliveryChipTone>): string {
  switch (tone) {
    case "wicket":
      return "border-red-500/40 bg-red-500/15 text-red-800 dark:text-red-200";
    case "boundary":
    case "six":
      return "border-emerald-500/40 bg-emerald-500/15 text-emerald-900 dark:text-emerald-100";
    case "extra":
      return "border-amber-500/35 bg-amber-500/10 text-amber-900 dark:text-amber-100";
    default:
      return "border-[var(--rw-border)] bg-[var(--rw-surface-hover)] text-[var(--rw-text)]";
  }
}
