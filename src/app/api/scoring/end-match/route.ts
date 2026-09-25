import { revalidatePath, revalidateTag } from "next/cache";
import { NextResponse } from "next/server";
import { z } from "zod";
import { scheduleMatchAiAnalysis } from "@/lib/ai/run-match-ai-analysis";
import { verifyScorerPin } from "@/lib/auth/scorer-pin";
import { CACHE_TAGS } from "@/lib/cache/tags";
import {
  requireScoringControllerSession,
  ScoringAuthorizationError,
} from "@/lib/auth/scoring-session";
import { clearScorerSessionCookie } from "@/lib/scoring/session-cookie";
import { createServiceRoleClient } from "@/lib/supabase/admin";

const bodySchema = z.object({
  pin: z.string().regex(/^\d{4}$/),
});

export async function POST(request: Request) {
  try {
    const json = await request.json();
    const body = bodySchema.parse(json);

    const session = await requireScoringControllerSession();
    const supabase = createServiceRoleClient();

    const { data: match, error: matchError } = await supabase
      .from("matches")
      .select("id, status, scorer_pin_hash, share_slug")
      .eq("id", session.matchId)
      .maybeSingle();

    if (matchError || !match) {
      return NextResponse.json({ error: "Match not found" }, { status: 404 });
    }

    if (session.matchId !== match.id) {
      return NextResponse.json({ error: "Scoring session match mismatch" }, { status: 403 });
    }

    if (match.status === "completed" || match.status === "abandoned") {
      return NextResponse.json({ error: "Match already finalized" }, { status: 409 });
    }

    const pinOk = await verifyScorerPin(body.pin, match.scorer_pin_hash);
    if (!pinOk) {
      return NextResponse.json({ error: "Incorrect scorer PIN" }, { status: 401 });
    }

    const now = new Date().toISOString();

    const { error: matchUpdateError } = await supabase
      .from("matches")
      .update({
        status: "completed",
        completed_at: now,
      })
      .eq("id", match.id)
      .in("status", ["setup", "live"]);

    if (matchUpdateError) {
      return NextResponse.json(
        { error: "Could not finalize match" },
        { status: 500 },
      );
    }

    await supabase
      .from("scoring_sessions")
      .update({
        status: "ended",
        ended_at: now,
      })
      .eq("id", session.sessionId)
      .eq("status", "active");

    scheduleMatchAiAnalysis(match.id);
    if (match.share_slug) {
      revalidateTag(CACHE_TAGS.completedScorecards, "max");
      revalidateTag(CACHE_TAGS.careerStatistics, "max");
      revalidatePath(`/match/${match.share_slug}`);
    }

    const response = NextResponse.json({
      match_id: match.id,
      share_slug: match.share_slug,
      status: "completed",
    });
    return clearScorerSessionCookie(response);
  } catch (err) {
    if (err instanceof ScoringAuthorizationError) {
      const status =
        err.code === "not_scoring_controller" ? 403 : 401;
      return NextResponse.json({ error: err.message, code: err.code }, { status });
    }
    const message = err instanceof Error ? err.message : "Invalid request";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
