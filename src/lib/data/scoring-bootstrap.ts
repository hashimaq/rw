import "server-only";
import type { Delivery } from "@/lib/database/types";
import type {
  ScoringBootstrap,
  SquadPlayerOption,
} from "@/lib/data/scoring-bootstrap-types";
import { deliveryRowToInput } from "@/lib/mappers/delivery";
import { resultSummaryFromPersistedMatch } from "@/lib/scoring/derive-match-result";
import { createClient } from "@/lib/supabase/server";

export type {
  ScoringBootstrap,
  ScoringInningsInfo,
  SquadPlayerOption,
} from "@/lib/data/scoring-bootstrap-types";

export async function loadScoringBootstrap(
  shareSlug: string,
): Promise<ScoringBootstrap | null> {
  const supabase = await createClient();

  const { data: match, error: matchError } = await supabase
    .from("matches")
    .select(
      "id, match_number, opponent_name, status, overs_limit, red_wings_batting_first, share_slug, result, winner, win_margin, win_margin_type",
    )
    .eq("share_slug", shareSlug)
    .maybeSingle();

  if (matchError || !match) return null;

  const { data: inningsRows, error: inningsError } = await supabase
    .from("innings")
    .select("*")
    .eq("match_id", match.id)
    .order("innings_number", { ascending: true });

  if (inningsError || !inningsRows?.length) return null;

  const active =
    inningsRows.find((i) => i.innings_status === "in_progress") ??
    inningsRows.find((i) => i.innings_status === "not_started") ??
    inningsRows[inningsRows.length - 1];

  const { data: squadRows } = await supabase
    .from("match_squads")
    .select("player_id, squad_status, is_captain, is_wicketkeeper")
    .eq("match_id", match.id);

  const playerIds = [...new Set((squadRows ?? []).map((r) => r.player_id))];
  const { data: players } = await supabase
    .from("players")
    .select("id, full_name, is_official_squad")
    .in(
      "id",
      playerIds.length ? playerIds : ["00000000-0000-0000-0000-000000000000"],
    );

  const playerMap = new Map(
    (players ?? []).map((p) => [
      p.id,
      {
        name: p.full_name,
        isGuest: p.is_official_squad === false,
      },
    ]),
  );

  const redWingsSquad: SquadPlayerOption[] = (squadRows ?? [])
    .map((row) => {
      const meta = playerMap.get(row.player_id);
      if (!meta) return null;
      return {
        id: row.player_id,
        name: meta.name,
        isCaptain: row.is_captain,
        isWicketkeeper: row.is_wicketkeeper,
        squadStatus: row.squad_status as "playing_xi" | "bench",
        isGuest: meta.isGuest,
      };
    })
    .filter((p): p is SquadPlayerOption => p != null);

  const { data: deliveryRows } = await supabase
    .from("deliveries")
    .select("*")
    .eq("innings_id", active.id)
    .order("sequence_in_innings", { ascending: true });

  const deliveries = ((deliveryRows ?? []) as Delivery[]).map(deliveryRowToInput);

  return {
    matchId: match.id,
    shareSlug: match.share_slug ?? shareSlug,
    matchNumber: match.match_number,
    opponentName: match.opponent_name,
    status: match.status,
    oversLimit: match.overs_limit,
    redWingsBatFirst: match.red_wings_batting_first ?? true,
    innings: inningsRows.map((i) => ({
      id: i.id,
      inningsNumber: i.innings_number,
      battingTeam: i.batting_team,
      bowlingTeam: i.bowling_team,
      inningsStatus: i.innings_status,
      target: i.target,
      oversLimit: i.overs_limit,
      totalRuns: i.total_runs,
      wickets: i.wickets,
    })),
    resultSummary: resultSummaryFromPersistedMatch({
      result: match.result,
      winner: match.winner,
      win_margin: match.win_margin,
      win_margin_type: match.win_margin_type,
      opponent_name: match.opponent_name,
    }),
    activeInningsId: active.id,
    redWingsSquad,
    deliveries,
  };
}
