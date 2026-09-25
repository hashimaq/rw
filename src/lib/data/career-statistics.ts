import "server-only";

import { unstable_cache } from "next/cache";
import { cache } from "react";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database, Delivery, InningsRow, Match } from "@/lib/database/types";
import { CACHE_TAGS } from "@/lib/cache/tags";
import { getServerSession } from "@/lib/auth/server-session";
import { deliveriesByInningsFromRows } from "@/lib/scorecard/persisted-scorecard-assembler";
import {
  aggregateCareerStatistics,
  type CareerStatisticsSnapshot,
  type CompletedMatchForStats,
  type PlayerRecentInningsPerformance,
} from "@/lib/statistics/aggregate-career";
import {
  emptyPlayerCareerStats,
  type PlayerCareerStats,
} from "@/lib/statistics/player-career";
import { createClient } from "@/lib/supabase/server";
import { createPublicSupabaseClient } from "@/lib/supabase/public";

type CompletedMatchRow = Pick<
  Match,
  | "id"
  | "match_number"
  | "opponent_name"
  | "match_date"
  | "completed_at"
  | "share_slug"
  | "overs_limit"
  | "winner"
  | "result"
  | "status"
>;

async function loadCompletedMatchesForStats(
  supabase: SupabaseClient<Database>,
): Promise<CompletedMatchRow[]> {
  const { data, error } = await supabase
    .from("matches")
    .select(
      "id, match_number, opponent_name, match_date, completed_at, share_slug, overs_limit, winner, result, status",
    )
    .eq("status", "completed")
    .not("share_slug", "is", null)
    .order("completed_at", { ascending: false, nullsFirst: false });

  if (error) throw error;
  return (data ?? []) as CompletedMatchRow[];
}

async function loadStatsBundleWithClient(
  supabase: SupabaseClient<Database>,
): Promise<CareerStatisticsSnapshot> {
  const matches = await loadCompletedMatchesForStats(supabase);
  if (matches.length === 0) {
    return { statsByPlayerId: {}, recentByPlayerId: {} };
  }

  const matchIds = matches.map((m) => m.id);

  const [{ data: inningsRows, error: innErr }, { data: squadRows, error: squadErr }] =
    await Promise.all([
      supabase
        .from("innings")
        .select("*")
        .in("match_id", matchIds)
        .order("innings_number", { ascending: true }),
      supabase
        .from("match_squads")
        .select("match_id, player_id, squad_status, is_captain")
        .in("match_id", matchIds),
    ]);

  if (innErr) throw innErr;
  if (squadErr) throw squadErr;

  const innings = (inningsRows ?? []) as InningsRow[];
  const inningsIds = innings.map((i) => i.id);

  let deliveryRows: Delivery[] = [];
  if (inningsIds.length > 0) {
    const { data, error } = await supabase
      .from("deliveries")
      .select("*")
      .in("innings_id", inningsIds)
      .order("sequence_in_innings", { ascending: true });
    if (error) throw error;
    deliveryRows = (data ?? []) as Delivery[];
  }

  const inningsByMatch = new Map<string, InningsRow[]>();
  for (const inn of innings) {
    const list = inningsByMatch.get(inn.match_id) ?? [];
    list.push(inn);
    inningsByMatch.set(inn.match_id, list);
  }

  const squadByMatch = new Map<
    string,
    CompletedMatchForStats["squad"]
  >();
  for (const row of squadRows ?? []) {
    const list = squadByMatch.get(row.match_id) ?? [];
    list.push({
      playerId: row.player_id,
      squadStatus: row.squad_status,
      isCaptain: row.is_captain,
    });
    squadByMatch.set(row.match_id, list);
  }

  const bundles: CompletedMatchForStats[] = matches.map((m) => {
    const matchInnings = inningsByMatch.get(m.id) ?? [];
    const deliveriesByInningsId = deliveriesByInningsFromRows(
      matchInnings,
      deliveryRows.filter((d) =>
        matchInnings.some((inn) => inn.id === d.innings_id),
      ),
    );
    return {
      matchId: m.id,
      shareSlug: m.share_slug,
      matchNumber: m.match_number,
      opponentName: m.opponent_name,
      matchDate: m.match_date,
      completedAt: m.completed_at,
      oversLimit: m.overs_limit,
      winner: m.winner,
      result: m.result ?? "no_result",
      innings: matchInnings,
      deliveriesByInningsId,
      squad: squadByMatch.get(m.id) ?? [],
    };
  });

  return aggregateCareerStatistics(bundles);
}

const getCachedPublicCareerStatistics = unstable_cache(
  async () => {
    const supabase = createPublicSupabaseClient();
    return loadStatsBundleWithClient(supabase);
  },
  ["career-statistics-public-v1"],
  {
    tags: [CACHE_TAGS.careerStatistics, CACHE_TAGS.completedScorecards],
    revalidate: 120,
  },
);

export const fetchCareerStatisticsSnapshot = cache(
  async (): Promise<CareerStatisticsSnapshot> => {
    const { admin } = await getServerSession();
    if (admin) {
      const supabase = await createClient();
      return loadStatsBundleWithClient(supabase);
    }
    return getCachedPublicCareerStatistics();
  },
);

export async function getPlayerCareerStats(
  playerId: string,
): Promise<PlayerCareerStats> {
  const snapshot = await fetchCareerStatisticsSnapshot();
  return snapshot.statsByPlayerId[playerId] ?? emptyPlayerCareerStats(playerId);
}

export async function getPlayerRecentPerformances(
  playerId: string,
  limit = 12,
): Promise<PlayerRecentInningsPerformance[]> {
  const snapshot = await fetchCareerStatisticsSnapshot();
  const list = snapshot.recentByPlayerId[playerId] ?? [];
  return list.slice(0, limit);
}
