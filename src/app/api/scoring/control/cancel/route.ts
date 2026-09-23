import { NextResponse } from "next/server";
import { z } from "zod";
import { requireActiveScorerSession } from "@/lib/auth/scoring-session";
import { notifyScoringControlChange } from "@/lib/scoring/notify-scoring-control-change";
import { createServiceRoleClient } from "@/lib/supabase/admin";

const bodySchema = z.object({
  match_id: z.string().uuid(),
});

export async function POST(request: Request) {
  try {
    const json = await request.json();
    const body = bodySchema.parse(json);
    const session = await requireActiveScorerSession(body.match_id);
    const supabase = createServiceRoleClient();

    const { error: cancelError } = await supabase
      .from("scoring_control_transfers")
      .update({
        status: "cancelled",
        resolved_at: new Date().toISOString(),
      })
      .eq("match_id", body.match_id)
      .eq("requesting_session_id", session.sessionId)
      .eq("status", "pending");

    if (cancelError) {
      return NextResponse.json({ error: cancelError.message }, { status: 500 });
    }

    notifyScoringControlChange(body.match_id, "transfer_cancelled");

    return NextResponse.json({ status: "cancelled" });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Invalid request";
    const status = message.includes("session") ? 401 : 400;
    return NextResponse.json({ error: message }, { status });
  }
}
