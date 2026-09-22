import { unstable_cache } from "next/cache";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Player, Database } from "@/lib/database/types";
import { CACHE_TAGS } from "@/lib/cache/tags";
import { queryOfficialPlayers } from "@/lib/data/players-query";
import { createClient } from "@/lib/supabase/server";
import { createPublicSupabaseClient } from "@/lib/supabase/public";
import { cache } from "react";

const PLAYER_LIST_SELECT =
  "id, full_name, jersey_number, role, batting_style, bowling_style, date_of_birth, joined_date, is_active, archived_at, is_official_squad, created_at, updated_at" as const;

async function loadOfficialPlayersCached(
  includeInactive: boolean,
): Promise<Player[]> {
  const supabase = createPublicSupabaseClient();
  return queryOfficialPlayers(supabase, includeInactive);
}

const cachedOfficialPlayersAll = unstable_cache(
  () => loadOfficialPlayersCached(true),
  ["official-players-all"],
  { tags: [CACHE_TAGS.players], revalidate: 300 },
);

const cachedOfficialPlayersActive = unstable_cache(
  () => loadOfficialPlayersCached(false),
  ["official-players-active"],
  { tags: [CACHE_TAGS.players], revalidate: 300 },
);

export async function getOfficialPlayers(
  includeInactive = true,
): Promise<Player[]> {
  return includeInactive
    ? cachedOfficialPlayersAll()
    : cachedOfficialPlayersActive();
}

/** Fresh squad read (uses request cookies) — for admin match setup and mutations. */
export async function getOfficialPlayersForRequest(
  supabase: SupabaseClient<Database>,
  includeInactive = false,
): Promise<Player[]> {
  return queryOfficialPlayers(supabase, includeInactive);
}

export const getPlayerById = cache(async (id: string): Promise<Player | null> => {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("players")
    .select(PLAYER_LIST_SELECT)
    .eq("id", id)
    .maybeSingle();
  if (error) throw error;
  return (data as Player | null) ?? null;
});

export async function countSquadStats(): Promise<{
  total: number;
  active: number;
  inactive: number;
}> {
  const players = await getOfficialPlayers(true);
  const active = players.filter((p) => p.is_active && !p.archived_at).length;
  return {
    total: players.length,
    active,
    inactive: players.length - active,
  };
}
