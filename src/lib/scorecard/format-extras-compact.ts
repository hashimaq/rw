import type { ScorecardExtrasBreakdown } from "@/lib/scorecard/types";

/** Compact extras lines like the mobile template (`WD 1`, `NB 2`, …). */
export function formatExtrasCompactLines(
  breakdown: ScorecardExtrasBreakdown,
): string[] {
  const lines: string[] = [];
  if (breakdown.wides > 0) lines.push(`WD ${breakdown.wides}`);
  if (breakdown.noBalls > 0) lines.push(`NB ${breakdown.noBalls}`);
  if (breakdown.byes > 0) lines.push(`B ${breakdown.byes}`);
  if (breakdown.legByes > 0) lines.push(`LB ${breakdown.legByes}`);
  if (breakdown.penalty > 0) lines.push(`P ${breakdown.penalty}`);
  return lines;
}
