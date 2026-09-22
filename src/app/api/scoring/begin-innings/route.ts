import { NextResponse } from "next/server";
import { z } from "zod";
import {
  requireScoringControllerSession,
  ScoringAuthorizationError,
} from "@/lib/auth/scoring-session";
import { createServiceRoleClient } from "@/lib/supabase/admin";

const bodySchema = z.object({
  innings_id: z.string().uuid(),
});

/** Marks an innings as in progress (first ball or after setup). */
export async function POST(request: Request) {
  try {
    const json = await request.json();
    const { innings_id: inningsId } = bodySchema.parse(json);
    const session = await requireScoringControllerSession();
    const supabase = createServiceRoleClient();

    const { data: innings, error: inningsError } = await supabase
      .from("innings")
      .select("id, match_id, innings_status")
      .eq("id", inningsId)
      .maybeSingle();

    if (inningsError || !innings) {
      return NextResponse.json({ error: "Innings not found" }, { status: 404 });
    }
    if (innings.match_id !== session.matchId) {
      return NextResponse.json({ error: "Match mismatch" }, { status: 403 });
    }

    if (innings.innings_status === "not_started") {
      const { error: updateError } = await supabase
        .from("innings")
        .update({ innings_status: "in_progress" })
        .eq("id", inningsId);

      if (updateError) {
        return NextResponse.json({ error: updateError.message }, { status: 500 });
      }
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    if (err instanceof ScoringAuthorizationError) {
      return NextResponse.json({ error: err.message }, { status: 401 });
    }
    const message = err instanceof Error ? err.message : "Invalid request";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
