import { NextResponse } from "next/server";
import { z } from "zod";
import {
  recordScoringControlAudit,
  resolveMatchAuditActorUserId,
} from "@/lib/audit/record-scoring-control";
import { requireActiveScorerSession } from "@/lib/auth/scoring-session";
import { findActiveControllerSession } from "@/lib/scoring/control";
import { createServiceRoleClient } from "@/lib/supabase/admin";

const bodySchema = z.object({
  match_id: z.string().uuid(),
});

export async function POST(request: Request) {
  try {
    const json = await request.json();
    const body = bodySchema.parse(json);
    const session = await requireActiveScorerSession(body.match_id);

    if (session.isScoringController) {
      return NextResponse.json(
        { error: "already_controller" },
        { status: 409 },
      );
    }

    const supabase = createServiceRoleClient();
    const controller = await findActiveControllerSession(supabase, body.match_id);
    if (!controller) {
      return NextResponse.json(
        { error: "no_active_controller" },
        { status: 409 },
      );
    }

    await supabase
      .from("scoring_control_transfers")
      .update({
        status: "cancelled",
        resolved_at: new Date().toISOString(),
      })
      .eq("match_id", body.match_id)
      .eq("requesting_session_id", session.sessionId)
      .eq("status", "pending");

    const { data: transfer, error: insertError } = await supabase
      .from("scoring_control_transfers")
      .insert({
        match_id: body.match_id,
        requesting_session_id: session.sessionId,
        controller_session_id: controller.id,
        status: "pending",
      })
      .select("id")
      .single();

    if (insertError || !transfer) {
      return NextResponse.json(
        { error: "Could not request scoring control" },
        { status: 500 },
      );
    }

    const actorUserId = await resolveMatchAuditActorUserId(supabase, body.match_id);
    await recordScoringControlAudit(supabase, {
      action: "SCORING_CONTROL_REQUESTED",
      matchId: body.match_id,
      actorUserId,
      metadata: {
        transfer_id: transfer.id,
        requesting_session_id: session.sessionId,
        controller_session_id: controller.id,
        initiator: "scorer_session",
      },
    });

    return NextResponse.json({
      transfer_id: transfer.id,
      status: "pending",
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Invalid request";
    const status = message.includes("session") ? 401 : 400;
    return NextResponse.json({ error: message }, { status });
  }
}
