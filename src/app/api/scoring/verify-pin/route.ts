import { NextResponse } from "next/server";
import { z } from "zod";
import { assertInstalledScoringSurface } from "@/lib/auth/assert-installed-scoring-surface";
import { ScoringAuthorizationError } from "@/lib/auth/scoring-authorization-error";
import { verifyScorerPin } from "@/lib/auth/scorer-pin";
import { requireActiveScorerSession } from "@/lib/auth/scoring-session";
import { findActiveControllerSession } from "@/lib/scoring/control";
import {
  insertScoringSession,
  markMatchLiveIfSetup,
} from "@/lib/scoring/establish-session";
import { applyScorerSessionCookie } from "@/lib/scoring/session-cookie";
import { createServiceRoleClient } from "@/lib/supabase/admin";

const bodySchema = z.object({
  match_id: z.string().uuid(),
  pin: z.string().regex(/^\d{4}$/),
  device_label: z.string().max(120).optional(),
});

export async function POST(request: Request) {
  try {
    const json = await request.json();
    const body = bodySchema.parse(json);
    const supabase = createServiceRoleClient();

    const { data: match, error: matchError } = await supabase
      .from("matches")
      .select("id, status, scorer_pin_hash")
      .eq("id", body.match_id)
      .maybeSingle();

    if (matchError || !match) {
      return NextResponse.json({ error: "Match not found" }, { status: 404 });
    }

    try {
      const existing = await requireActiveScorerSession(body.match_id);
      return NextResponse.json({
        session_id: existing.sessionId,
        match_id: body.match_id,
        status: "active",
        scoring_role: existing.isScoringController ? "controller" : "viewer",
        resumed: true,
      });
    } catch {
      /* New or expired cookie — verify PIN below */
    }

    const pinOk = await verifyScorerPin(body.pin, match.scorer_pin_hash);
    if (!pinOk) {
      return NextResponse.json({ error: "Incorrect scorer PIN" }, { status: 401 });
    }

    await assertInstalledScoringSurface();

    const controller = await findActiveControllerSession(supabase, body.match_id);

    let isScoringController = !controller;
    let sessionId: string;
    let token: string;

    try {
      ({ sessionId, token } = await insertScoringSession(
        supabase,
        body.match_id,
        body.device_label,
        { isScoringController },
      ));
    } catch (insertErr) {
      const code =
        insertErr instanceof Error &&
        "code" in insertErr &&
        (insertErr as Error & { code?: string }).code ===
          "controller_already_assigned"
          ? "controller_already_assigned"
          : null;
      if (!code) throw insertErr;
      isScoringController = false;
      ({ sessionId, token } = await insertScoringSession(
        supabase,
        body.match_id,
        body.device_label,
        { isScoringController: false },
      ));
    }

    if (isScoringController) {
      await markMatchLiveIfSetup(supabase, body.match_id, match.status);
    }

    const response = NextResponse.json({
      session_id: sessionId,
      match_id: body.match_id,
      status: "active",
      scoring_role: isScoringController ? "controller" : "viewer",
    });

    return applyScorerSessionCookie(response, sessionId, token);
  } catch (err) {
    if (err instanceof ScoringAuthorizationError) {
      const status =
        err.code === "installed_app_required" ||
        err.code === "not_scoring_controller"
          ? 403
          : 401;
      return NextResponse.json({ error: err.message, code: err.code }, { status });
    }
    const message = err instanceof Error ? err.message : "Invalid request";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
