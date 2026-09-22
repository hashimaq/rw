import type { ScorecardInningsDocument } from "@/lib/scorecard/types";

export function formatFallOfWicketEntry(
  f: ScorecardInningsDocument["fallOfWickets"][number],
): string {
  return `${f.score}-${f.wicketNumber} (${f.batter}, ${f.over})`;
}

/** Comma-separated horizontal list matching professional scorecard layout. */
export function formatFallOfWicketsLine(
  fallOfWickets: ScorecardInningsDocument["fallOfWickets"],
): string {
  return fallOfWickets.map(formatFallOfWicketEntry).join(", ");
}
