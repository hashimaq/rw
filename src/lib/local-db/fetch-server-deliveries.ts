"use client";

import { createClient } from "@/lib/supabase/client";

export type ServerDeliveryRow = {
  client_event_id: string;
  sequence_in_innings: number;
  innings_id: string;
};

/** Read-only public delivery list for a match (anon RLS). */
export async function fetchServerDeliveriesForMatch(
  matchId: string,
): Promise<ServerDeliveryRow[]> {
  const supabase = createClient();
  const { data: innings, error: inningsError } = await supabase
    .from("innings")
    .select("id")
    .eq("match_id", matchId);
  if (inningsError) {
    throw new Error(inningsError.message);
  }
  const inningsIds = (innings ?? []).map((i) => i.id);
  if (inningsIds.length === 0) return [];

  const { data: deliveries, error } = await supabase
    .from("deliveries")
    .select("client_event_id, sequence_in_innings, innings_id")
    .in("innings_id", inningsIds)
    .order("sequence_in_innings");
  if (error) {
    throw new Error(error.message);
  }
  return deliveries ?? [];
}
