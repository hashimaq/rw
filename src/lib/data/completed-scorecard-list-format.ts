import type { BattingSide } from "@/lib/database/types";
import type { CompletedScorecardSummary } from "@/lib/data/completed-scorecard-list";
import { publicScorecardPath } from "@/lib/match/share-slug";

export function teamInningsScoreLabel(
  battingTeam: BattingSide,
  opponentName: string,
  totalRuns: number,
  wickets: number,
): string {
  const team = battingTeam === "red_wings" ? "Red Wings" : opponentName;
  return `${team} ${totalRuns}/${wickets}`;
}

export function formatCompletedMatchMeta(summary: CompletedScorecardSummary): string {
  const parts: string[] = [];
  if (summary.matchNumber) parts.push(summary.matchNumber);
  if (summary.matchDate) parts.push(summary.matchDate);
  if (summary.seriesName) parts.push(summary.seriesName);
  if (summary.tournamentName) parts.push(summary.tournamentName);
  return parts.join(" · ");
}

export function scorecardHrefFromArchive(slug: string): string {
  return `${publicScorecardPath(slug)}?from=scorecards`;
}

/** Sort key: newest completed first (fallback to match date). */
export function completedMatchSortKey(summary: CompletedScorecardSummary): string {
  return summary.completedAt ?? summary.matchDate ?? "";
}

export function isCompletedStatusForArchive(
  status: string,
): status is "completed" {
  return status === "completed";
}
