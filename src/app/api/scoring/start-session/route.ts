import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAdmin } from "@/lib/auth/admin";
import { requireActiveScorerSession } from "@/lib/auth/scoring-session";
import { findActiveControllerSession } from "@/lib/scoring/control";
import {
  insertScoringSession,
  markMatchLiveIfSetup,
} from "@/lib/scoring/establish-session";
import { applyScorerSessionCookie } from "@/lib/scoring/session-cookie";
import { createClient } from "@/lib/supabase/server";
import { createServiceRoleClient } from "@/lib/supabase/admin";

const bodySchema = z.object({
  match_id: z.string().uuid(),
  device_label: z.string().max(120).optional(),
});

/**
 * Admin-only: start scoring after match setup without re-entering the PIN.
 * Uses the same scoring-session + httpOnly cookie as verify-pin.
 */
export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    await requireAdmin(supabase);

    const json = await request.json();
    const body = bodySchema.parse(json);
    const service = createServiceRoleClient();

    const { data: match, error: matchError } = await service
      .from("matches")
      .select("id, status")
      .eq("id", body.match_id)
      .maybeSingle();

    if (matchError || !match) {
      return NextResponse.json({ error: "Match not found" }, { status: 404 });
    }

    try {
      const existing = await requireActiveScorerSession(match.id);
      return NextResponse.json({
        match_id: match.id,
        status: "active",
        scoring_role: existing.isScoringController ? "controller" : "viewer",
        resumed: true,
      });
    } catch {
      /* continue */
    }

    const controller = await findActiveControllerSession(service, match.id);
    if (controller) {
      return NextResponse.json(
        {
          error: "controller_active_elsewhere",
          scoring_role: "viewer",
          message:
            "Another device is controlling scoring. Enter the scorer PIN to watch or request control.",
        },
        { status: 409 },
      );
    }

    if (match.status !== "setup") {
      return NextResponse.json(
        {
          error: "pin_required",
          message: "Use Enter as Scorer with the scorer PIN for this match.",
        },
        { status: 403 },
      );
    }

    let sessionId: string;
    let token: string;
    try {
      ({ sessionId, token } = await insertScoringSession(
        service,
        match.id,
        body.device_label,
        { isScoringController: true },
      ));
    } catch (insertErr) {
      const lostRace =
        insertErr instanceof Error &&
        "code" in insertErr &&
        (insertErr as Error & { code?: string }).code ===
          "controller_already_assigned";
      if (lostRace) {
        return NextResponse.json(
          {
            error: "controller_active_elsewhere",
            scoring_role: "viewer",
            message:
              "Another device is controlling scoring. Enter the scorer PIN to watch or request control.",
          },
          { status: 409 },
        );
      }
      throw insertErr;
    }
    await markMatchLiveIfSetup(service, match.id, match.status);

    const response = NextResponse.json({
      session_id: sessionId,
      match_id: match.id,
      status: "active",
      scoring_role: "controller",
    });
    return applyScorerSessionCookie(response, sessionId, token);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Invalid request";
    const status = message.includes("Admin") ? 403 : 400;
    return NextResponse.json({ error: message }, { status });
  }
}
