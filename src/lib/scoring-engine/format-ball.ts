import type { DeliveryInput } from "./types";

/** Compact label for recent-ball strip. */
export function formatDeliveryLabel(d: DeliveryInput): string {
  if (d.notes === "dead_ball") return "DB";
  if (d.isWicket) {
    if (d.wicketType === "run_out") return "RO";
    if (d.wicketType === "retired") return "Ret";
    return "W";
  }
  if (d.extraType === "wide") {
    return d.totalRuns > 1 ? `Wd+${d.totalRuns - 1}` : "Wd";
  }
  if (d.extraType === "no_ball") {
    if (d.batterRuns > 0) return `Nb+${d.batterRuns}`;
    return "Nb";
  }
  if (d.extraType === "bye") {
    return d.totalRuns > 1 ? `B${d.totalRuns}` : "B";
  }
  if (d.extraType === "leg_bye") {
    return d.totalRuns > 1 ? `Lb${d.totalRuns}` : "Lb";
  }
  return String(d.batterRuns);
}
