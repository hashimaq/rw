import type { SupabaseClient } from "@supabase/supabase-js";
import { deliveryRowToInput } from "@/lib/mappers/delivery";
import type { Database, Delivery, InningsRow } from "@/lib/database/types";
import { buildInningsStateFromDeliveries } from "@/lib/scoring-engine";
import {
  deriveMatchResult,
  type InningsResultInput,
} from "@/lib/scoring/derive-match-result";

/**
 * After match status is completed, derive result from deliveries and persist once.
 * Idempotent: skips when `matches.result` is already set.
 */
export async function persistMatchResultIfNeeded(
  supabase: SupabaseClient<Database>,
  matchId: string,
): Promise<{ persisted: boolean }> {
  const { data: match, error: matchError } = await supabase
    .from("matches")
    .select(
      "id, status, result, opponent_name, winner, win_margin, win_margin_type",
    )
    .eq("id", matchId)
    .maybeSingle();

  if (matchError || !match) {
    throw new Error("Match not found");
  }

  if (match.status !== "completed") {
    return { persisted: false };
  }

  if (match.result != null) {
    return { persisted: false };
  }

  const { data: inningsRows, error: inningsError } = await supabase
    .from("innings")
    .select("*")
    .eq("match_id", matchId)
    .order("innings_number", { ascending: true });

  if (inningsError || !inningsRows?.length) {
    return { persisted: false };
  }

  const innings = inningsRows as InningsRow[];
  if (innings.length < 2) {
    return { persisted: false };
  }

  const inningsIds = innings.map((i) => i.id);
  const { data: deliveryRows, error: deliveriesError } = await supabase
    .from("deliveries")
    .select("*")
    .in("innings_id", inningsIds)
    .order("sequence_in_innings", { ascending: true });

  if (deliveriesError) {
    throw new Error("Could not load deliveries for result derivation");
  }

  const deliveriesByInnings = new Map<string, ReturnType<typeof deliveryRowToInput>[]>();
  for (const id of inningsIds) {
    deliveriesByInnings.set(id, []);
  }
  for (const row of (deliveryRows ?? []) as Delivery[]) {
    deliveriesByInnings.get(row.innings_id)?.push(deliveryRowToInput(row));
  }

  const inningsInputs: InningsResultInput[] = innings.map((row) => {
    const deliveries = deliveriesByInnings.get(row.id) ?? [];
    const state = buildInningsStateFromDeliveries(
      deliveries,
      row.overs_limit,
      row.target,
    );
    return {
      inningsNumber: row.innings_number,
      battingTeam: row.batting_team,
      totalRuns: state.totalRuns,
      wickets: state.wickets,
      target: row.target,
    };
  });

  const derived = deriveMatchResult(inningsInputs, match.opponent_name);
  if (!derived) {
    return { persisted: false };
  }

  const { data: updated, error: updateError } = await supabase
    .from("matches")
    .update({
      result: derived.result,
      winner: derived.winner,
      win_margin: derived.winMargin,
      win_margin_type: derived.winMarginType,
    })
    .eq("id", matchId)
    .is("result", null)
    .select("id")
    .maybeSingle();

  if (updateError) {
    throw new Error("Could not persist match result");
  }

  return { persisted: updated != null };
}
