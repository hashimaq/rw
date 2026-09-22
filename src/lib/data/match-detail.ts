import { createClient } from "@/lib/supabase/server";
import { MATCH_CARD_SELECT } from "@/lib/data/match-select";
import type { Match, Player } from "@/lib/database/types";

export type MatchSquadMember = {
  player_id: string;
  squad_status: string;
  is_captain: boolean;
  is_wicketkeeper: boolean;
  player: Pick<
    Player,
    "id" | "full_name" | "jersey_number" | "is_official_squad"
  >;
};

export async function fetchMatchWithSquad(matchId: string): Promise<{
  match: Match;
  squad: MatchSquadMember[];
} | null> {
  const supabase = await createClient();

  const { data: match, error: matchError } = await supabase
    .from("matches")
    .select(
      `${MATCH_CARD_SELECT}, toss_winner, toss_decision, red_wings_batting_first, overs_limit, venue, status, share_slug`,
    )
    .eq("id", matchId)
    .maybeSingle();

  if (matchError) throw matchError;
  if (!match) return null;

  const { data: squadRows, error: squadError } = await supabase
    .from("match_squads")
    .select("player_id, squad_status, is_captain, is_wicketkeeper")
    .eq("match_id", matchId);

  if (squadError) throw squadError;

  const playerIds = [...new Set((squadRows ?? []).map((r) => r.player_id))];
  const { data: players, error: playersError } = await supabase
    .from("players")
    .select("id, full_name, jersey_number, is_official_squad")
    .in("id", playerIds.length ? playerIds : ["00000000-0000-0000-0000-000000000000"]);

  if (playersError) throw playersError;

  const playerMap = new Map((players ?? []).map((p) => [p.id, p]));

  const squad: MatchSquadMember[] = (squadRows ?? [])
    .map((row) => {
      const player = playerMap.get(row.player_id);
      if (!player) return null;
      return {
        player_id: row.player_id,
        squad_status: row.squad_status,
        is_captain: row.is_captain,
        is_wicketkeeper: row.is_wicketkeeper,
        player,
      };
    })
    .filter(Boolean) as MatchSquadMember[];

  squad.sort((a, b) => {
    if (a.squad_status !== b.squad_status) {
      return a.squad_status === "playing_xi" ? -1 : 1;
    }
    const ja = a.player.jersey_number ?? 9999;
    const jb = b.player.jersey_number ?? 9999;
    if (ja !== jb) return ja - jb;
    return a.player.full_name.localeCompare(b.player.full_name);
  });

  return { match: match as Match, squad };
}
