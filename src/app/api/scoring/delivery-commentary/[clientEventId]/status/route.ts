import { NextResponse } from "next/server";
import {
  requireScoringControllerSession,
  ScoringAuthorizationError,
} from "@/lib/auth/scoring-session";
import { createServiceRoleClient } from "@/lib/supabase/admin";

export async function GET(
  _request: Request,
  context: { params: Promise<{ clientEventId: string }> },
) {
  try {
    const session = await requireScoringControllerSession();
    const { clientEventId } = await context.params;

    const supabase = createServiceRoleClient();
    const { data: row, error } = await supabase
      .from("delivery_commentary")
      .select("match_id, innings_id, sequence_in_innings, status, error_message")
      .eq("client_event_id", clientEventId)
      .maybeSingle();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    if (!row || row.match_id !== session.matchId) {
      return NextResponse.json({ status: "none", ready: false });
    }

    return NextResponse.json({
      status: row.status,
      ready: row.status === "ready",
      innings_id: row.innings_id,
      sequence_in_innings: row.sequence_in_innings,
      error_message:
        row.status === "failed" ? row.error_message ?? null : null,
    });
  } catch (err) {
    if (err instanceof ScoringAuthorizationError) {
      const status =
        err.code === "session_required" || err.code === "session_invalid"
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
