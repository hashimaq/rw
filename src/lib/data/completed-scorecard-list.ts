import "server-only";

import type { BattingSide, Match } from "@/lib/database/types";
import { completedMatchSortKey } from "@/lib/data/completed-scorecard-list-format";
import { resultSummaryFromPersistedMatch } from "@/lib/scoring/derive-match-result";
import { createClient } from "@/lib/supabase/server";

export const COMPLETED_SCORECARDS_PAGE_SIZE = 40;

export interface CompletedInningsScoreLine {
  inningsNumber: number;
  battingTeam: BattingSide;
  totalRuns: number;
  wickets: number;
}

export interface CompletedScorecardSummary {
  id: string;
  shareSlug: string;
  matchNumber: string;
  opponentName: string;
  matchDate: string | null;
  completedAt: string | null;
  seriesName: string | null;
  tournamentName: string | null;
  resultSummary: string | null;
  inningsScores: CompletedInningsScoreLine[];
}

type MatchRow = Pick<
  Match,
  | "id"
  | "match_number"
  | "opponent_name"
  | "match_date"
  | "completed_at"
  | "share_slug"
  | "result"
  | "winner"
  | "win_margin"
  | "win_margin_type"
  | "status"
> & {
  series: { name: string } | null;
  tournament: { name: string } | null;
  innings: Array<{
    innings_number: number;
    batting_team: BattingSide;
    total_runs: number;
    wickets: number;
  }>;
};

/** Lightweight completed-match list for `/scorecards` (no deliveries). */
export async function fetchCompletedScorecardSummaries(
  limit = COMPLETED_SCORECARDS_PAGE_SIZE,
): Promise<CompletedScorecardSummary[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("matches")
    .select(
      `
      id,
      match_number,
      opponent_name,
      match_date,
      completed_at,
      share_slug,
      result,
      winner,
      win_margin,
      win_margin_type,
      status,
      series:series_id ( name ),
      tournament:tournament_id ( name ),
      innings ( innings_number, batting_team, total_runs, wickets )
    `,
    )
    .eq("status", "completed")
    .not("share_slug", "is", null)
    .order("completed_at", { ascending: false, nullsFirst: false })
    .order("match_date", { ascending: false, nullsFirst: false })
    .limit(limit);

  if (error) throw error;

  const rows = (data ?? []) as MatchRow[];

  const mapped = rows
    .filter((row) => row.status === "completed" && row.share_slug)
    .map((row) => ({
      id: row.id,
      shareSlug: row.share_slug!,
      matchNumber: row.match_number,
      opponentName: row.opponent_name,
      matchDate: row.match_date,
      completedAt: row.completed_at,
      seriesName: row.series?.name ?? null,
      tournamentName: row.tournament?.name ?? null,
      resultSummary: resultSummaryFromPersistedMatch({
        result: row.result,
        winner: row.winner,
        win_margin: row.win_margin,
        win_margin_type: row.win_margin_type,
        opponent_name: row.opponent_name,
      }),
      inningsScores: [...(row.innings ?? [])]
        .sort((a, b) => a.innings_number - b.innings_number)
        .map((inn) => ({
          inningsNumber: inn.innings_number,
          battingTeam: inn.batting_team,
          totalRuns: inn.total_runs,
          wickets: inn.wickets,
        })),
    }));

  return mapped.sort((a, b) =>
    completedMatchSortKey(b).localeCompare(completedMatchSortKey(a)),
  );
}
