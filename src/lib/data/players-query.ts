import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database, Player } from "@/lib/database/types";

const PLAYER_LIST_WITH_OFFICIAL =
  "id, full_name, jersey_number, role, batting_style, bowling_style, date_of_birth, joined_date, is_active, archived_at, is_official_squad, created_at, updated_at" as const;

const PLAYER_LIST_LEGACY =
  "id, full_name, jersey_number, role, batting_style, bowling_style, date_of_birth, joined_date, is_active, archived_at, created_at, updated_at" as const;

function isMissingOfficialSquadColumn(message: string): boolean {
  return (
    message.includes("is_official_squad") ||
    message.includes("column") && message.includes("does not exist")
  );
}

/** Official squad list — works before/after guest-player migration. */
export async function queryOfficialPlayers(
  supabase: SupabaseClient<Database>,
  includeInactive: boolean,
): Promise<Player[]> {
  let query = supabase
    .from("players")
    .select(PLAYER_LIST_WITH_OFFICIAL)
    .eq("is_official_squad", true)
    .order("jersey_number", { ascending: true });

  if (!includeInactive) {
    query = query.eq("is_active", true).is("archived_at", null);
  }

  let { data, error } = await query;

  if (error && isMissingOfficialSquadColumn(error.message)) {
    let legacyQuery = supabase
      .from("players")
      .select(PLAYER_LIST_LEGACY)
      .order("jersey_number", { ascending: true });

    if (!includeInactive) {
      legacyQuery = legacyQuery.eq("is_active", true).is("archived_at", null);
    }

    const legacy = await legacyQuery;
    if (legacy.error) throw legacy.error;
    return (legacy.data ?? []).map((row) => ({
      ...row,
      is_official_squad: true,
    })) as Player[];
  }

  if (error) throw error;
  return (data ?? []) as Player[];
}
