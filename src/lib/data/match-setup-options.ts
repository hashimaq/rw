import { createClient } from "@/lib/supabase/server";
import { getOfficialPlayersForRequest } from "@/lib/data/players";
import type { Player } from "@/lib/database/types";

export type MatchSetupOptions = {
  players: Player[];
  series: Array<{ id: string; name: string; status: string }>;
  tournaments: Array<{ id: string; name: string; status: string }>;
};

export async function fetchMatchSetupOptions(): Promise<MatchSetupOptions> {
  const supabase = await createClient();

  const [players, seriesRes, tournamentsRes] = await Promise.all([
    getOfficialPlayersForRequest(supabase, false),
    supabase
      .from("series")
      .select("id, name, status")
      .order("name", { ascending: true }),
    supabase
      .from("tournaments")
      .select("id, name, status")
      .order("name", { ascending: true }),
  ]);

  if (seriesRes.error) throw seriesRes.error;
  if (tournamentsRes.error) throw tournamentsRes.error;

  return {
    players,
    series: seriesRes.data ?? [],
    tournaments: tournamentsRes.data ?? [],
  };
}
