import type { ScorecardExtrasBreakdown } from "@/lib/scorecard/types";

/** Full extras breakdown like the reference template `(b 1, lb 0, w 12, nb 3, p 0)`. */
export function formatExtrasBreakdownFull(
  breakdown: ScorecardExtrasBreakdown,
): string {
  return `(b ${breakdown.byes}, lb ${breakdown.legByes}, w ${breakdown.wides}, nb ${breakdown.noBalls}, p ${breakdown.penalty})`;
}
