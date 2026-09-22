import { NextResponse } from "next/server";
import { z } from "zod";
import {
  recordScoringControlAudit,
  resolveMatchAuditActorUserId,
} from "@/lib/audit/record-scoring-control";
import { requireScoringControllerSession } from "@/lib/auth/scoring-session";
import { createServiceRoleClient } from "@/lib/supabase/admin";

const bodySchema = z.object({
  match_id: z.string().uuid(),
  transfer_id: z.string().uuid(),
  action: z.enum(["keep", "transfer"]),
});

export async function POST(request: Request) {
  try {
    const json = await request.json();
    const body = bodySchema.parse(json);
    const session = await requireScoringControllerSession(body.match_id);
    const supabase = createServiceRoleClient();

    const { data: transfer, error: transferError } = await supabase
      .from("scoring_control_transfers")
      .select("id, match_id, status, controller_session_id, requesting_session_id")
      .eq("id", body.transfer_id)
      .maybeSingle();

    if (transferError || !transfer || transfer.match_id !== body.match_id) {
      return NextResponse.json({ error: "Transfer not found" }, { status: 404 });
    }
    if (transfer.controller_session_id !== session.sessionId) {
      return NextResponse.json({ error: "Not authorized" }, { status: 403 });
    }
    if (transfer.status !== "pending") {
      return NextResponse.json({ error: "Transfer is no longer pending" }, { status: 409 });
    }

    const actorUserId = await resolveMatchAuditActorUserId(supabase, body.match_id);

    if (body.action === "keep") {
      const { error: rejectError } = await supabase
        .from("scoring_control_transfers")
        .update({
          status: "rejected",
          resolved_at: new Date().toISOString(),
        })
        .eq("id", body.transfer_id)
        .eq("status", "pending");

      if (rejectError) {
        return NextResponse.json({ error: rejectError.message }, { status: 500 });
      }

      await recordScoringControlAudit(supabase, {
        action: "SCORING_CONTROL_DECLINED",
        matchId: body.match_id,
        actorUserId,
        metadata: {
          transfer_id: body.transfer_id,
          controller_session_id: session.sessionId,
          requesting_session_id: transfer.requesting_session_id,
          initiator: "scorer_session",
        },
      });

      return NextResponse.json({ status: "rejected" });
    }

    const { data: newControllerId, error: rpcError } = await supabase.rpc(
      "approve_scoring_control_transfer",
      { p_transfer_id: body.transfer_id },
    );

    if (rpcError) {
      const msg = rpcError.message.includes("transfer_not_pending")
        ? "Transfer is no longer pending"
        : rpcError.message;
      return NextResponse.json({ error: msg }, { status: 409 });
    }

    await recordScoringControlAudit(supabase, {
      action: "SCORING_CONTROL_TRANSFERRED",
      matchId: body.match_id,
      actorUserId,
      previous_data: {
        controller_session_id: session.sessionId,
      },
      new_data: {
        controller_session_id: newControllerId,
      },
      metadata: {
        transfer_id: body.transfer_id,
        initiator: "scorer_session",
      },
    });

    return NextResponse.json({
      status: "approved",
      controller_session_id: newControllerId,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Invalid request";
    let status = 400;
    if (message.includes("not the active scoring controller")) status = 403;
    if (message.includes("Scoring session")) status = 401;
    return NextResponse.json({ error: message }, { status });
  }
}
