import "server-only";

import { deliveryRowToInput } from "@/lib/mappers/delivery";
import {
  buildFullMatchScorecard,
  type ScorecardSquadMember,
} from "@/lib/scorecard/build-scorecard";
import type { FullMatchScorecardData } from "@/lib/scorecard/types";
import type { Delivery, InningsRow, Match } from "@/lib/database/types";
import type { DeliveryInput } from "@/lib/scoring-engine/types";
import { createClient } from "@/lib/supabase/server";

type MatchScorecardRow = Match & {
  series: { name: string } | null;
  tournament: { name: string } | null;
  player_of_match: { full_name: string } | null;
};

/**
 * Load an entire match and rebuild every innings from persisted deliveries.
 * Separate from `loadScoringBootstrap()` (active innings scorer path).
 */
export async function loadFullMatchScorecardData(
  shareSlug: string,
): Promise<FullMatchScorecardData | null> {
  const supabase = await createClient();

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

  if (matchError || !matchRow) return null;

  const match = matchRow as MatchScorecardRow;

  const [{ data: inningsRows, error: inningsError }, { data: squadRows, error: squadError }] =
    await Promise.all([
      supabase
        .from("innings")
        .select("*")
        .eq("match_id", match.id)
        .order("innings_number", { ascending: true }),
      supabase
        .from("match_squads")
        .select(
          "player_id, squad_status, is_captain, is_wicketkeeper, batting_position, created_at",
        )
        .eq("match_id", match.id)
        .order("created_at", { ascending: true }),
    ]);

  if (inningsError || squadError) return null;
  if (!inningsRows?.length) return null;

  const innings = inningsRows as InningsRow[];
  const inningsIds = innings.map((i) => i.id);

  const playerIds = [...new Set((squadRows ?? []).map((r) => r.player_id))];

  const [{ data: players, error: playersError }, { data: deliveryRows, error: deliveriesError }] =
    await Promise.all([
      supabase
        .from("players")
        .select("id, full_name, jersey_number, is_official_squad")
        .in(
          "id",
          playerIds.length ? playerIds : ["00000000-0000-0000-0000-000000000000"],
        ),
      supabase
        .from("deliveries")
        .select("*")
        .in("innings_id", inningsIds)
        .order("sequence_in_innings", { ascending: true }),
    ]);

  if (playersError || deliveriesError) return null;

  const playerMap = new Map(
    (players ?? []).map((p) => [
      p.id,
      {
        fullName: p.full_name,
        jerseyNumber: p.jersey_number,
        isGuest: p.is_official_squad === false,
      },
    ]),
  );

  const squad: ScorecardSquadMember[] = (squadRows ?? [])
    .map((row, index) => {
      const meta = playerMap.get(row.player_id);
      if (!meta) return null;
      return {
        playerId: row.player_id,
        fullName: meta.fullName,
        jerseyNumber: meta.jerseyNumber,
        isCaptain: row.is_captain,
        isWicketkeeper: row.is_wicketkeeper,
        squadStatus: row.squad_status as "playing_xi" | "bench",
        isGuest: meta.isGuest,
        battingPosition: row.batting_position ?? null,
        squadOrder: index,
      };
    })
    .filter((m): m is ScorecardSquadMember => m != null);

  const deliveriesByInningsId = new Map<string, DeliveryInput[]>();
  for (const id of inningsIds) {
    deliveriesByInningsId.set(id, []);
  }
  for (const row of (deliveryRows ?? []) as Delivery[]) {
    const list = deliveriesByInningsId.get(row.innings_id);
    if (list) {
      list.push(deliveryRowToInput(row));
    }
  }

  return buildFullMatchScorecard({
    match: match as Match,
    seriesName: match.series?.name ?? null,
    tournamentName: match.tournament?.name ?? null,
    playerOfMatchId: match.player_of_match_id,
    playerOfMatchName: match.player_of_match?.full_name ?? null,
    squad,
    innings,
    deliveriesByInningsId,
  });
}
