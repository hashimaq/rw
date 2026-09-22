import type { Match } from "@/lib/database/types";
import { MATCH_CARD_SELECT } from "@/lib/data/match-select";
import { createClient } from "@/lib/supabase/server";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/database/types";

async function fetchLiveMatchesWith(
  supabase: SupabaseClient<Database>,
): Promise<Match[]> {
  const { data, error } = await supabase
    .from("matches")
    .select(MATCH_CARD_SELECT)
    .eq("status", "live")
    .order("started_at", { ascending: false });

  if (error) throw error;
  return (data ?? []) as Match[];
}

async function fetchRecentMatchesWith(
  supabase: SupabaseClient<Database>,
  limit: number,
): Promise<Match[]> {
  const { data, error } = await supabase
    .from("matches")
    .select(MATCH_CARD_SELECT)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) throw error;
  return (data ?? []) as Match[];
}

async function fetchAllMatchesWith(
  supabase: SupabaseClient<Database>,
): Promise<Match[]> {
  const { data, error } = await supabase
    .from("matches")
    .select(MATCH_CARD_SELECT)
    .order("match_date", { ascending: false, nullsFirst: false })
    .order("created_at", { ascending: false });

  if (error) throw error;
  return (data ?? []) as Match[];
}

/** Live matches — always fresh (no cache). */
export async function fetchLiveMatches(): Promise<Match[]> {
  const supabase = await createClient();
  return fetchLiveMatchesWith(supabase);
}

export async function fetchRecentMatches(limit = 5): Promise<Match[]> {
  const supabase = await createClient();
  return fetchRecentMatchesWith(supabase, limit);
}

/** Match lists for history/matches hub (per-request; uses session for RLS). */
export async function fetchAllMatches(): Promise<Match[]> {
  const supabase = await createClient();
  return fetchAllMatchesWith(supabase);
}

/** Matches available for public scoring entry (setup or live, with share link). */
export async function fetchScorableMatches(): Promise<Match[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("matches")
    .select(MATCH_CARD_SELECT)
    .in("status", ["setup", "live"])
    .not("share_slug", "is", null)
    .order("status", { ascending: true })
    .order("created_at", { ascending: false });

  if (error) throw error;
  return (data ?? []) as Match[];
}

export async function fetchHomeMatches(): Promise<{
  live: Match[];
  recent: Match[];
}> {
  const supabase = await createClient();
  const [live, recent] = await Promise.all([
    fetchLiveMatchesWith(supabase),
    fetchRecentMatchesWith(supabase, 5),
  ]);
  return { live, recent };
}
