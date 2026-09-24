import { revalidatePath, revalidateTag } from "next/cache";
import { NextResponse } from "next/server";
import { scheduleMatchAiAnalysis } from "@/lib/ai/run-match-ai-analysis";
import { CACHE_TAGS } from "@/lib/cache/tags";
import { z } from "zod";
import {
  requireScoringControllerSession,
  ScoringAuthorizationError,
} from "@/lib/auth/scoring-session";
import { createServiceRoleClient } from "@/lib/supabase/admin";
import {
  finalizeMatchIfNeeded,
  shouldAutoCompleteMatchAfterInnings,
} from "@/lib/scoring/finalize-match";
import { persistMatchResultIfNeeded } from "@/lib/scoring/persist-match-result";
import { resultSummaryFromPersistedMatch } from "@/lib/scoring/derive-match-result";

const bodySchema = z.object({
  innings_id: z.string().uuid(),
  total_runs: z.number().int().min(0),
  wickets: z.number().int().min(0).max(10),
});

export async function POST(request: Request) {
  try {
    const json = await request.json();
    const { innings_id: inningsId, total_runs, wickets } =
      bodySchema.parse(json);
    const session = await requireScoringControllerSession();
    const supabase = createServiceRoleClient();

    const { data: innings, error: inningsError } = await supabase
      .from("innings")
      .select("id, match_id, innings_number")
      .eq("id", inningsId)
      .maybeSingle();

    const { data: matchMeta } = await supabase
      .from("matches")
      .select("share_slug")
      .eq("id", session.matchId)
      .maybeSingle();

    if (inningsError || !innings) {
      return NextResponse.json({ error: "Innings not found" }, { status: 404 });
    }
    if (innings.match_id !== session.matchId) {
      return NextResponse.json({ error: "Match mismatch" }, { status: 403 });
    }

    if (total_runs > 0 || wickets > 0) {
      const { count, error: deliveryCountError } = await supabase
        .from("deliveries")
        .select("id", { count: "exact", head: true })
        .eq("innings_id", inningsId);

      if (deliveryCountError) {
        return NextResponse.json(
          { error: deliveryCountError.message },
          { status: 500 },
        );
      }
      if ((count ?? 0) === 0) {
        return NextResponse.json(
          {
            error:
              "Cannot complete innings until ball-by-ball deliveries are synced to the server.",
            code: "deliveries_not_synced",
          },
          { status: 409 },
        );
      }
    }

    const { error: updateError } = await supabase
      .from("innings")
      .update({
        innings_status: "completed",
        total_runs,
        wickets,
        completed_at: new Date().toISOString(),
      })
      .eq("id", inningsId);

    if (updateError) {
      return NextResponse.json({ error: updateError.message }, { status: 500 });
    }

    let matchCompleted = false;
    if (shouldAutoCompleteMatchAfterInnings(innings.innings_number)) {
      const result = await finalizeMatchIfNeeded(
        supabase,
        innings.match_id,
        session.sessionId,
      );
      await persistMatchResultIfNeeded(supabase, innings.match_id);
      matchCompleted = result.completed;
      if (!matchCompleted) {
        const { data: matchRow } = await supabase
          .from("matches")
          .select("status")
          .eq("id", innings.match_id)
          .maybeSingle();
        matchCompleted = matchRow?.status === "completed";
      }
    }

    let resultSummary: string | null = null;
    if (matchCompleted) {
      const { data: matchRow } = await supabase
        .from("matches")
        .select(
          "result, winner, win_margin, win_margin_type, opponent_name",
        )
        .eq("id", innings.match_id)
        .maybeSingle();
      if (matchRow) {
        resultSummary = resultSummaryFromPersistedMatch(matchRow);
      }
    }

    const payload = {
      ok: true,
      match_completed: matchCompleted,
      innings_number: innings.innings_number,
      result_summary: resultSummary,
    };

    if (matchCompleted) {
      scheduleMatchAiAnalysis(innings.match_id);
    }

    if (matchMeta?.share_slug) {
      if (matchCompleted) {
        revalidateTag(CACHE_TAGS.completedScorecards, "max");
      }
      revalidatePath(`/match/${matchMeta.share_slug}`);
    }

    return NextResponse.json(payload);
  } catch (err) {
    if (err instanceof ScoringAuthorizationError) {
      return NextResponse.json({ error: err.message }, { status: 401 });
    }
    const message = err instanceof Error ? err.message : "Invalid request";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
