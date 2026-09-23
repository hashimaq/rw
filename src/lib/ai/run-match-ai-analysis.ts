import "server-only";

import { revalidatePath, revalidateTag } from "next/cache";
import { buildMatchPerformanceDataset } from "@/lib/ai/match-performance-dataset";
import { requestMatchAiAnalysis } from "@/lib/ai/providers/request-match-ai-analysis";
import {
  modelOutputToStoredAnalysis,
  validateModelOutputAgainstDataset,
} from "@/lib/ai/validate-match-analysis-output";
import {
  buildScorecardFromPersistedRows,
  buildSquadMembersFromPersisted,
  collectPlayerIds,
  deliveriesByInningsFromRows,
  playerNamesFromAllDeliveries,
  type PersistedSquadRow,
} from "@/lib/scorecard/persisted-scorecard-assembler";
import { persistedScorecardDataIncomplete } from "@/lib/scorecard/scorecard-persisted-integrity";
import type { InningsRow, Match } from "@/lib/database/types";
import { createServiceRoleClient } from "@/lib/supabase/admin";

type MatchRow = Match & {
  series: { name: string } | null;
  tournament: { name: string } | null;
  player_of_match: { full_name: string } | null;
};

const PROCESSING_STALE_MS = 12 * 60 * 1000;

function isRecent(iso: string | null | undefined, maxAgeMs: number): boolean {
  if (!iso) return false;
  const t = Date.parse(iso);
  if (Number.isNaN(t)) return false;
  return Date.now() - t < maxAgeMs;
}

export async function runMatchAiAnalysis(matchId: string): Promise<void> {
  const supabase = createServiceRoleClient();

  const { data: existingRow } = await supabase
    .from("match_ai_analysis")
    .select("status, updated_at")
    .eq("match_id", matchId)
    .maybeSingle();

  if (existingRow?.status === "completed") return;
  if (
    existingRow?.status === "processing" &&
    isRecent(existingRow.updated_at, PROCESSING_STALE_MS)
  ) {
    return;
  }

  const { data: match, error: matchError } = await supabase
    .from("matches")
    .select(
      `
      *,
      series:series_id ( name ),
      tournament:tournament_id ( name ),
      player_of_match:player_of_match_id ( full_name )
    `,
    )
    .eq("id", matchId)
    .maybeSingle();

  if (matchError || !match) return;
  if ((match as Match).status !== "completed") return;

  const { data: innings } = await supabase
    .from("innings")
    .select("*")
    .eq("match_id", matchId)
    .order("innings_number");

  const inningsRows = (innings ?? []) as InningsRow[];
  const inningsIds = inningsRows.map((i) => i.id);

  const [{ data: squadRows }, { data: deliveryRows }] = await Promise.all([
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
      .in(
        "innings_id",
        inningsIds.length ? inningsIds : ["00000000-0000-0000-0000-000000000000"],
      )
      .order("sequence_in_innings"),
  ]);

  if (
    persistedScorecardDataIncomplete(inningsRows, deliveryRows ?? [])
  ) {
    await supabase.from("match_ai_analysis").upsert(
      {
        match_id: matchId,
        status: "failed",
        error_message: "incomplete_match_data",
        generated_at: new Date().toISOString(),
      },
      { onConflict: "match_id" },
    );
    return;
  }

  await supabase.from("match_ai_analysis").upsert(
    {
      match_id: matchId,
      status: "processing",
      error_message: null,
    },
    { onConflict: "match_id" },
  );

  try {
    const deliveriesByInningsId = deliveriesByInningsFromRows(
      inningsRows,
      deliveryRows ?? [],
    );
    const deliveryNameByPlayerId =
      playerNamesFromAllDeliveries(deliveriesByInningsId);
    const playerIds = collectPlayerIds(
      (squadRows ?? []) as PersistedSquadRow[],
      deliveriesByInningsId,
    );

    const { data: playersData } = playerIds.length
      ? await supabase
          .from("players")
          .select("id, full_name, jersey_number, is_official_squad")
          .in("id", playerIds)
      : { data: [] };

    const scorecard = buildScorecardFromPersistedRows({
      match: match as MatchRow,
      innings: inningsRows,
      squadRows: (squadRows ?? []) as PersistedSquadRow[],
      deliveryRows: deliveryRows ?? [],
      players: playersData ?? [],
    });

    const squadMembers = buildSquadMembersFromPersisted(
      (squadRows ?? []) as PersistedSquadRow[],
      deliveryNameByPlayerId,
      playersData ?? [],
    );

    const dataset = buildMatchPerformanceDataset(scorecard, squadMembers);
    if (dataset.participants.length === 0) {
      throw new Error("No participating players in dataset");
    }

    const { output, model, provider } = await requestMatchAiAnalysis(dataset);
    validateModelOutputAgainstDataset(output, dataset);
    const stored = modelOutputToStoredAnalysis(output, dataset, {
      provider,
      model,
    });

    const momPlayerId = stored.man_of_the_match.player_id;

    await supabase.from("match_ai_analysis").upsert(
      {
        match_id: matchId,
        status: "completed",
        player_of_match_id: momPlayerId,
        generated_analysis: stored,
        model_version: model,
        error_message: null,
        generated_at: new Date().toISOString(),
      },
      { onConflict: "match_id" },
    );

    if (momPlayerId) {
      await supabase
        .from("matches")
        .update({ player_of_match_id: momPlayerId })
        .eq("id", matchId);
    }

    const shareSlug = (match as Match).share_slug;
    if (shareSlug) {
      revalidateTag(`scorecard:${shareSlug}`, "max");
      revalidatePath(`/match/${shareSlug}`);
    }
    revalidateTag(`scorecard-match:${matchId}`, "max");
  } catch (err) {
    console.error(
      "[match-ai] analysis failed:",
      matchId,
      err instanceof Error ? err.message : err,
    );
    const message = err instanceof Error ? err.message : "AI analysis failed";
    await supabase.from("match_ai_analysis").upsert(
      {
        match_id: matchId,
        status: "failed",
        error_message: message.slice(0, 500),
        generated_at: new Date().toISOString(),
      },
      { onConflict: "match_id" },
    );
  }
}

export function scheduleMatchAiAnalysis(matchId: string): void {
  void runMatchAiAnalysis(matchId).catch((err) => {
    console.error(
      "[match-ai] scheduled run failed:",
      matchId,
      err instanceof Error ? err.message : err,
    );
  });
}
