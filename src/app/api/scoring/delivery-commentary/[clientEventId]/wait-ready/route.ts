import { NextResponse } from "next/server";
import { getCommentaryAudioFromEphemeralCache } from "@/lib/commentary/commentary-audio-ephemeral-cache";
import {
  getCommentaryReadyMeta,
  waitForCommentaryReadySignal,
} from "@/lib/commentary/commentary-ready-notifier";
import {
  requireScoringControllerSession,
  ScoringAuthorizationError,
} from "@/lib/auth/scoring-session";
import { createServiceRoleClient } from "@/lib/supabase/admin";

const HOLD_MS = 45_000;
const POLL_SLICE_MS = 40;

export async function GET(
  _request: Request,
  context: { params: Promise<{ clientEventId: string }> },
) {
  try {
    const session = await requireScoringControllerSession();
    const { clientEventId } = await context.params;
    const deadline = Date.now() + HOLD_MS;

    while (Date.now() < deadline) {
      const meta = getCommentaryReadyMeta(clientEventId);
      if (meta?.failed) {
        if (meta.matchId !== session.matchId) {
          return NextResponse.json({ error: "Forbidden" }, { status: 403 });
        }
        return NextResponse.json({
          ready: false,
          status: "failed",
          error_message: meta.errorMessage ?? null,
        });
      }

      const ephemeral = getCommentaryAudioFromEphemeralCache(clientEventId);
      const row = await loadRow(clientEventId, session.matchId);

      if (meta && meta.matchId === session.matchId && !meta.failed) {
        return NextResponse.json({
          ready: true,
          status: "ready",
          innings_id: meta.inningsId,
          sequence_in_innings: meta.sequenceInInnings,
          audio_ephemeral: Boolean(ephemeral),
        });
      }

      if (ephemeral && ephemeral.matchId === session.matchId && row?.status === "ready") {
        return NextResponse.json({
          ready: true,
          status: "ready",
          innings_id: row.inningsId,
          sequence_in_innings: row.sequenceInInnings,
          audio_ephemeral: true,
        });
      }

      if (row?.status === "ready") {
        return NextResponse.json({
          ready: true,
          status: "ready",
          innings_id: row.inningsId,
          sequence_in_innings: row.sequenceInInnings,
          audio_ephemeral: Boolean(ephemeral),
        });
      }

      if (row?.status === "failed") {
        return NextResponse.json({
          ready: false,
          status: "failed",
          error_message: row.errorMessage,
        });
      }

      const remaining = deadline - Date.now();
      if (remaining <= 0) break;
      await waitForCommentaryReadySignal(
        clientEventId,
        Math.min(POLL_SLICE_MS, remaining),
      );
    }

    return NextResponse.json({ ready: false, status: "pending" }, { status: 408 });
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

async function loadRow(
  clientEventId: string,
  matchId: string,
): Promise<{
  status: string;
  inningsId: string;
  sequenceInInnings: number;
  errorMessage: string | null;
} | null> {
  const supabase = createServiceRoleClient();
  const { data: row } = await supabase
    .from("delivery_commentary")
    .select("match_id, innings_id, sequence_in_innings, status, error_message")
    .eq("client_event_id", clientEventId)
    .maybeSingle();

  if (!row || row.match_id !== matchId) return null;
  return {
    status: row.status,
    inningsId: row.innings_id,
    sequenceInInnings: row.sequence_in_innings,
    errorMessage: row.status === "failed" ? row.error_message ?? null : null,
  };
}
