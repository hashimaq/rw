import type { DeliveryInput } from "./types";

export function deliveryChipTone(
  d: DeliveryInput,
): "wicket" | "boundary" | "six" | "extra" | "neutral" {
  if (d.notes === "dead_ball") return "extra";
  if (d.isWicket) return "wicket";
  if (d.extraType === "wide" || d.extraType === "no_ball") return "extra";
  if (d.extraType !== "none") return "neutral";
  if (d.batterRuns === 6 || d.isSix) return "six";
  if (d.batterRuns === 4 || d.isBoundary) return "boundary";
  return "neutral";
}

export function deliveryChipClassName(
  tone: ReturnType<typeof deliveryChipTone>,
): string {
  switch (tone) {
    case "wicket":
      return "border-red-600/50 bg-red-600/20 font-bold text-red-950 dark:border-red-400/60 dark:bg-red-950/50 dark:text-red-100";
    case "six":
      return "border-violet-600/50 bg-violet-600/20 font-bold text-violet-950 dark:border-violet-400/60 dark:bg-violet-950/50 dark:text-violet-100";
    case "boundary":
      return "border-emerald-600/50 bg-emerald-600/20 font-bold text-emerald-950 dark:border-emerald-400/60 dark:bg-emerald-950/50 dark:text-emerald-100";
    case "extra":
      return "border-amber-600/55 bg-amber-400/25 font-bold text-amber-950 dark:border-amber-400/70 dark:bg-amber-500/20 dark:text-amber-50";
    default:
      return "border-[var(--rw-border)] bg-[var(--rw-surface-hover)] font-semibold text-[var(--rw-text)]";
  }
}
