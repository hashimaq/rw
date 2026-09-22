import type { ScorecardExtrasBreakdown } from "@/lib/scorecard/types";

function extrasBreakdownParts(breakdown: ScorecardExtrasBreakdown): string[] {
  const parts: string[] = [];
  if (breakdown.byes > 0) parts.push(`b ${breakdown.byes}`);
  if (breakdown.legByes > 0) parts.push(`lb ${breakdown.legByes}`);
  if (breakdown.wides > 0) parts.push(`w ${breakdown.wides}`);
  if (breakdown.noBalls > 0) parts.push(`nb ${breakdown.noBalls}`);
  if (breakdown.penalty > 0) parts.push(`p ${breakdown.penalty}`);
  return parts;
}

/** Professional extras line e.g. `Extras 8 (b 2, lb 1, w 4, nb 1)`. */
export function formatInningsExtrasSummary(
  total: number,
  breakdown: ScorecardExtrasBreakdown,
): string {
  const parts = extrasBreakdownParts(breakdown);
  if (parts.length === 0) {
    return `Extras ${total}`;
  }
  return `Extras ${total} (${parts.join(", ")})`;
}

/** Scorecard footer extras e.g. `16 (b 1, lb 0, w 12, nb 3)`. */
export function formatInningsExtrasDetail(
  total: number,
  breakdown: ScorecardExtrasBreakdown,
): string {
  const parts = extrasBreakdownParts(breakdown);
  if (parts.length === 0) {
    return String(total);
  }
  return `${total} (${parts.join(", ")})`;
}

/** Innings total line e.g. `(10 wkts, 49.3 Ov)`. */
export function formatInningsTotalSummary(
  wickets: number,
  overs: string,
): string {
  return `(${wickets} wkts, ${overs} Ov)`;
}
