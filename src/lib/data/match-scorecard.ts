import "server-only";

import { cache } from "react";
import { unstable_cache } from "next/cache";
import { ensureMatchAiAnalysisScheduled } from "@/lib/ai/ensure-match-ai-analysis";
import { buildMatchAiAnalysisView } from "@/lib/ai/load-match-ai-view";
import {
  buildScorecardFromParts,
  buildSquadMembersFromPersisted,
  collectPlayerIds,
  deliveriesByInningsFromRows,
  playerNamesFromAllDeliveries,
  type PersistedSquadRow,
} from "@/lib/scorecard/persisted-scorecard-assembler";
import { canShowFullMatchScorecardPage } from "@/lib/scorecard/public-scorecard-access";
import {
  inningsTotalsSummary,
  persistedScorecardDataIncomplete,
  type InningsTotalSummary,
} from "@/lib/scorecard/scorecard-persisted-integrity";
import type { MatchAiAnalysisRow } from "@/lib/database/types";
import type { FullMatchScorecardData } from "@/lib/scorecard/types";
import type { Delivery, InningsRow, Match } from "@/lib/database/types";
import { resultSummaryFromPersistedMatch } from "@/lib/scoring/derive-match-result";
import { createServiceRoleClient } from "@/lib/supabase/admin";

export { buildScorecardFromPersistedRows } from "@/lib/scorecard/persisted-scorecard-assembler";

type MatchScorecardRow = Match & {
  series: { name: string } | null;
  tournament: { name: string } | null;
  player_of_match: { full_name: string } | null;
};

export type MatchScorecardPageLoadResult =
  | { status: "ok"; data: FullMatchScorecardData }
  | {
      status: "incomplete_persisted_data";
      inningsTotals: InningsTotalSummary[];
      resultSummary: string | null;
    }
  | { status: "not_found" }
  | { status: "not_ready" }
  | { status: "forbidden" }
  | { status: "error" };

async function fetchPersistedScorecardRows(matchId: string): Promise<{
  innings: InningsRow[];
  squadRows: PersistedSquadRow[];
  deliveryRows: Delivery[];
} | null> {
  const supabase = createServiceRoleClient();

  const { data: inningsRows, error: inningsError } = await supabase
    .from("innings")
    .select("*")
    .eq("match_id", matchId)
    .order("innings_number", { ascending: true });

  if (inningsError) {
    console.error("[scorecard] innings load failed:", inningsError.message);
    return null;
  }
  if (!inningsRows?.length) return null;

  const innings = inningsRows as InningsRow[];
  const inningsIds = innings.map((i) => i.id);

  const [{ data: squadRows, error: squadError }, { data: deliveryRows, error: deliveriesError }] =
    await Promise.all([
      supabase
        .from("match_squads")
        .select(
          "player_id, squad_status, is_captain, is_wicketkeeper, batting_position, created_at",
        )
        .eq("match_id", matchId)
        .order("created_at", { ascending: true }),
      supabase
        .from("deliveries")
        .select("*")
        .in("innings_id", inningsIds)
        .order("sequence_in_innings", { ascending: true }),
    ]);

  if (squadError) {
    console.error("[scorecard] squad load failed:", squadError.message);
    return null;
  }
  if (deliveriesError) {
    console.error("[scorecard] deliveries load failed:", deliveriesError.message);
    return null;
  }

  return {
    innings,
    squadRows: squadRows ?? [],
    deliveryRows: (deliveryRows ?? []) as Delivery[],
  };
}

async function loadPlayersForIds(playerIds: string[]) {
  if (!playerIds.length) return [];
  const supabase = createServiceRoleClient();
  const { data, error } = await supabase
    .from("players")
    .select("id, full_name, jersey_number, is_official_squad")
    .in("id", playerIds);
  if (error) {
    console.error("[scorecard] players load failed:", error.message);
    return [];
  }
  return data ?? [];
}

async function buildScorecardCoreFromPersisted(
  match: MatchScorecardRow,
  persisted: {
    innings: InningsRow[];
    squadRows: PersistedSquadRow[];
    deliveryRows: Delivery[];
  },
  players: Awaited<ReturnType<typeof loadPlayersForIds>>,
): Promise<FullMatchScorecardData> {
  const deliveriesByInningsId = deliveriesByInningsFromRows(
    persisted.innings,
    persisted.deliveryRows,
  );
  const deliveryNameByPlayerId =
    playerNamesFromAllDeliveries(deliveriesByInningsId);

  return buildScorecardFromParts(
    match,
    persisted.innings,
    persisted.squadRows,
    deliveriesByInningsId,
    deliveryNameByPlayerId,
    players,
  );
}

async function loadPlayersForPersisted(
  persisted: {
    squadRows: PersistedSquadRow[];
    deliveryRows: Delivery[];
    innings: InningsRow[];
  },
): Promise<Awaited<ReturnType<typeof loadPlayersForIds>>> {
  const deliveriesByInningsId = deliveriesByInningsFromRows(
    persisted.innings,
    persisted.deliveryRows,
  );
  const playerIds = collectPlayerIds(
    persisted.squadRows,
    deliveriesByInningsId,
  );
  return loadPlayersForIds(playerIds);
}

async function buildScorecardFromPersistedFetch(
  match: MatchScorecardRow,
  persisted: {
    innings: InningsRow[];
    squadRows: PersistedSquadRow[];
    deliveryRows: Delivery[];
  },
): Promise<FullMatchScorecardData | null> {
  const players = await loadPlayersForPersisted(persisted);
  const built = await buildScorecardCoreFromPersisted(
    match,
    persisted,
    players,
  );
  return enrichScorecardWithAiAnalysis(built, persisted, players);
}

async function enrichScorecardWithAiAnalysis(
  data: FullMatchScorecardData,
  persisted: {
    innings: InningsRow[];
    squadRows: PersistedSquadRow[];
    deliveryRows: Delivery[];
  },
  players: Awaited<ReturnType<typeof loadPlayersForIds>>,
): Promise<FullMatchScorecardData> {
  const incomplete = persistedScorecardDataIncomplete(
    persisted.innings,
    persisted.deliveryRows,
  );
  const supabase = createServiceRoleClient();
  const { data: aiRow } = await supabase
    .from("match_ai_analysis")
    .select("status, error_message, generated_analysis")
    .eq("match_id", data.matchId)
    .maybeSingle();

  const deliveriesByInningsId = deliveriesByInningsFromRows(
    persisted.innings,
    persisted.deliveryRows,
  );
  const deliveryNameByPlayerId =
    playerNamesFromAllDeliveries(deliveriesByInningsId);
  const squad = buildSquadMembersFromPersisted(
    persisted.squadRows,
    deliveryNameByPlayerId,
    players,
  );

  const aiAnalysis = buildMatchAiAnalysisView(
    (aiRow as MatchAiAnalysisRow | null) ?? null,
    data,
    squad,
    incomplete,
  );

  if (aiAnalysis.state === "ready") {
    return {
      ...data,
      aiAnalysis,
      playerOfTheMatch: {
        assigned: true,
        playerId: aiAnalysis.manOfTheMatch.playerId,
        name: aiAnalysis.manOfTheMatch.name,
        teamLabel: aiAnalysis.manOfTheMatch.teamLabel,
        performanceSummary: aiAnalysis.manOfTheMatch.narrative,
      },
    };
  }

  return { ...data, aiAnalysis };
}

const getCachedCompletedScorecardCore = (
  match: MatchScorecardRow,
  persisted: {
    innings: InningsRow[];
    squadRows: PersistedSquadRow[];
    deliveryRows: Delivery[];
  },
  shareSlug: string,
  players: Awaited<ReturnType<typeof loadPlayersForIds>>,
) =>
  unstable_cache(
    async () => buildScorecardCoreFromPersisted(match, persisted, players),
    [
      "scorecard-v4-core",
      match.id,
      String(persisted.deliveryRows.length),
      persisted.innings.map((i) => `${i.id}:${i.total_runs}:${i.wickets}`).join("|"),
    ],
    {
      tags: [`scorecard:${shareSlug}`, `scorecard-match:${match.id}`],
      revalidate: 3600,
    },
  )();

/** AI analysis is always merged fresh — never served from unstable_cache. */
async function attachFreshAiAnalysis(
  data: FullMatchScorecardData,
  persisted: {
    innings: InningsRow[];
    squadRows: PersistedSquadRow[];
    deliveryRows: Delivery[];
  },
): Promise<FullMatchScorecardData> {
  const players = await loadPlayersForPersisted(persisted);
  return enrichScorecardWithAiAnalysis(data, persisted, players);
}

/**
 * Load an entire match and rebuild every innings from persisted deliveries.
 * Server-only; uses service role after access gate (authoritative persisted data).
 */
export const loadFullMatchScorecardData = cache(
  async (
    shareSlug: string,
    options: { isAdmin?: boolean } = {},
  ): Promise<FullMatchScorecardData | null> => {
    const result = await loadMatchScorecardPage(shareSlug, options.isAdmin ?? false);
    return result.status === "ok" ? result.data : null;
  },
);

/** Single entry for `/match/[slug]` — one match fetch, parallel persisted load. */
export const loadMatchScorecardPage = cache(
  async (
  shareSlug: string,
  isAdmin: boolean,
): Promise<MatchScorecardPageLoadResult> => {
  const supabase = createServiceRoleClient();
  const { data: matchRow, error: matchError } = await supabase
    .from("matches")
    .select(
      `
      *,
      series:series_id ( name ),
      tournament:tournament_id ( name ),
      player_of_match:player_of_match_id ( full_name )
    `,
    )
    .eq("share_slug", shareSlug)
    .maybeSingle();

  if (matchError || !matchRow) {
    return { status: "not_found" };
  }

  const match = matchRow as MatchScorecardRow;

  if (match.status === "setup" || match.status === "abandoned") {
    return { status: "not_ready" };
  }

  if (
    !canShowFullMatchScorecardPage(
      {
        status: match.status,
        is_public_scorecard: match.is_public_scorecard,
        is_public_live: match.is_public_live,
      },
      { isAdmin },
    )
  ) {
    return { status: "forbidden" };
  }

  try {
    const persisted = await fetchPersistedScorecardRows(match.id);
    if (!persisted) return { status: "error" };

    if (
      persistedScorecardDataIncomplete(
        persisted.innings,
        persisted.deliveryRows,
      )
    ) {
      return {
        status: "incomplete_persisted_data",
        inningsTotals: inningsTotalsSummary(persisted.innings),
        resultSummary: resultSummaryFromPersistedMatch(match),
      };
    }

    let data: FullMatchScorecardData | null;
    if (match.status === "completed") {
      ensureMatchAiAnalysisScheduled({
        matchId: match.id,
        matchStatus: match.status,
        innings: persisted.innings,
        deliveryRows: persisted.deliveryRows,
      });
      const players = await loadPlayersForPersisted(persisted);
      const core = await getCachedCompletedScorecardCore(
        match,
        persisted,
        shareSlug,
        players,
      );
      data = await attachFreshAiAnalysis(core, persisted);
    } else {
      data = await buildScorecardFromPersistedFetch(match, persisted);
    }

    if (!data) return { status: "error" };
    return { status: "ok", data };
  } catch (err) {
    console.error(
      "[scorecard] load failed:",
      err instanceof Error ? err.message : err,
    );
    return { status: "error" };
  }
},
);

