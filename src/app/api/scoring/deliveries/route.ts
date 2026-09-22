import { NextResponse } from "next/server";
import {
  requireScoringControllerSession,
  ScoringAuthorizationError,
} from "@/lib/auth/scoring-session";
import { deliveryInputSchema } from "@/lib/validation/delivery";
import { createServiceRoleClient } from "@/lib/supabase/admin";

export async function POST(request: Request) {
  try {
    const json = await request.json();
    const payload = deliveryInputSchema.parse(json);
    const session = await requireScoringControllerSession();

    const supabase = createServiceRoleClient();

    const { data: innings, error: inningsError } = await supabase
      .from("innings")
      .select("id, match_id")
      .eq("id", payload.innings_id)
      .maybeSingle();

    if (inningsError || !innings) {
      return NextResponse.json({ error: "Innings not found" }, { status: 404 });
    }
    if (innings.match_id !== session.matchId) {
      return NextResponse.json({ error: "Match mismatch" }, { status: 403 });
    }

    const { data, error } = await supabase.rpc("upsert_delivery_idempotent", {
      p_client_event_id: payload.client_event_id,
      p_innings_id: payload.innings_id,
      p_sequence_in_innings: payload.sequence_in_innings,
      p_over_number: payload.over_number,
      p_ball_number: payload.ball_number,
      p_striker_player_id: payload.striker_player_id ?? null,
      p_striker_name: payload.striker_name,
      p_non_striker_player_id: payload.non_striker_player_id ?? null,
      p_non_striker_name: payload.non_striker_name,
      p_bowler_player_id: payload.bowler_player_id ?? null,
      p_bowler_name: payload.bowler_name,
      p_batter_runs: payload.batter_runs,
      p_total_runs: payload.total_runs,
      p_extras_runs: payload.extras_runs,
      p_extra_type: payload.extra_type,
      p_is_legal_delivery: payload.is_legal_delivery,
      p_is_boundary: payload.is_boundary,
      p_is_six: payload.is_six,
      p_is_wicket: payload.is_wicket,
      p_wicket_type: payload.wicket_type,
      p_dismissed_player_id: payload.dismissed_player_id ?? null,
      p_dismissed_player_name: payload.dismissed_player_name ?? null,
      p_fielder_player_id: payload.fielder_player_id ?? null,
      p_fielder_name: payload.fielder_name ?? null,
      p_notes: payload.notes ?? null,
    });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ delivery_id: data });
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
