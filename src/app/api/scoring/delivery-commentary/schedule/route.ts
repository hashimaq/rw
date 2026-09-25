import { NextResponse } from "next/server";
import { z } from "zod";
import { scheduleDeliveryCommentaryForDelivery } from "@/lib/commentary/run-delivery-commentary";
import { shouldGenerateDeliveryCommentary } from "@/lib/commentary/should-generate-commentary";
import {
  requireScoringControllerSession,
  ScoringAuthorizationError,
} from "@/lib/auth/scoring-session";
import { deliveryInputSchema } from "@/lib/validation/delivery";
import { createServiceRoleClient } from "@/lib/supabase/admin";

const scheduleBodySchema = deliveryInputSchema.extend({
  delivery_committed_at_ms: z.number().optional(),
});

export async function POST(request: Request) {
  try {
    const json = await request.json();
    const parsed = scheduleBodySchema.parse(json);
    const { delivery_committed_at_ms: deliveryCommittedAtMs, ...payload } =
      parsed;
    const session = await requireScoringControllerSession();

    const supabase = createServiceRoleClient();
    const { data: innings, error: inningsError } = await supabase
      .from("innings")
      .select("id, match_id, overs_limit, target")
      .eq("id", payload.innings_id)
      .maybeSingle();

    if (inningsError || !innings) {
      return NextResponse.json({ error: "Innings not found" }, { status: 404 });
    }
    if (innings.match_id !== session.matchId) {
      return NextResponse.json(
        { error: "Match mismatch", code: "match_mismatch" },
        { status: 403 },
      );
    }

    if (!shouldGenerateDeliveryCommentary(payload)) {
      return NextResponse.json({ ok: true, skipped: true });
    }

    const { data: existingRows, error: listError } = await supabase
      .from("deliveries")
      .select("*")
      .eq("innings_id", payload.innings_id)
      .order("sequence_in_innings", { ascending: true });

    if (listError) {
      return NextResponse.json({ error: listError.message }, { status: 500 });
    }

    void scheduleDeliveryCommentaryForDelivery({
      matchId: session.matchId,
      payload,
      existingRows: existingRows ?? [],
      oversLimit: innings.overs_limit,
      target: innings.target,
      deliveryCommittedAtMs,
    });

    return NextResponse.json({ ok: true, scheduled: true });
  } catch (err) {
    if (err instanceof ScoringAuthorizationError) {
      const status =
        err.code === "not_scoring_controller"
          ? 403
          : err.code === "session_required" || err.code === "session_invalid"
            ? 401
            : 403;
      return NextResponse.json(
        { error: err.message, code: err.code },
        { status },
      );
    }
    const message = err instanceof Error ? err.message : "Invalid request";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
