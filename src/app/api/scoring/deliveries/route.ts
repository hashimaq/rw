import { revalidatePath } from "next/cache";
import { NextResponse } from "next/server";
import {
  requireScoringControllerSession,
  ScoringAuthorizationError,
} from "@/lib/auth/scoring-session";
import { payloadToDeliveryInput } from "@/lib/mappers/delivery";
import {
  buildInningsStateBeforeIncomingDelivery,
  validateIncomingDeliveryAgainstState,
} from "@/lib/scoring/validate-incoming-delivery";
import { sanitizeDeliveryPlayerIds } from "@/lib/scoring/sanitize-delivery-player-ids";
import { deliveryInputSchema } from "@/lib/validation/delivery";
import { createServiceRoleClient } from "@/lib/supabase/admin";

async function knownPlayerIdsForMatch(
  supabase: ReturnType<typeof createServiceRoleClient>,
  matchId: string,
): Promise<Set<string>> {
  const { data, error } = await supabase
    .from("match_squads")
    .select("player_id")
    .eq("match_id", matchId);
  if (error) {
    throw new Error(`Could not load match squad: ${error.message}`);
  }
  return new Set((data ?? []).map((row) => row.player_id));
}

export async function POST(request: Request) {
  try {
    const json = await request.json();
    const payload = deliveryInputSchema.parse(json);
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
      console.warn(
        "[deliveries] 403 match_mismatch",
        "session_match=",
        session.matchId,
        "innings_match=",
        innings.match_id,
      );
      return NextResponse.json(
        { error: "Match mismatch", code: "match_mismatch" },
        { status: 403 },
      );
    }

    const knownPlayerIds = await knownPlayerIdsForMatch(
      supabase,
      session.matchId,
    );
    const persistPayload = sanitizeDeliveryPlayerIds(payload, knownPlayerIds);

    const { data: existingRows, error: listError } = await supabase
      .from("deliveries")
      .select("*")
      .eq("innings_id", payload.innings_id)
      .order("sequence_in_innings", { ascending: true });

    if (listError) {
      return NextResponse.json({ error: listError.message }, { status: 500 });
    }

    const incoming = payloadToDeliveryInput(persistPayload);
    const stateBefore = buildInningsStateBeforeIncomingDelivery(
      existingRows ?? [],
      innings.overs_limit,
      innings.target,
      persistPayload.client_event_id,
      persistPayload.sequence_in_innings,
    );
    const bowlerRule = validateIncomingDeliveryAgainstState(
      stateBefore,
      incoming,
    );
    if (bowlerRule) {
      return NextResponse.json(
        { error: bowlerRule, code: "invalid_bowler" },
        { status: 400 },
      );
    }

    const { data, error } = await supabase.rpc("upsert_delivery_idempotent", {
      p_client_event_id: persistPayload.client_event_id,
      p_innings_id: persistPayload.innings_id,
      p_sequence_in_innings: persistPayload.sequence_in_innings,
      p_over_number: persistPayload.over_number,
      p_ball_number: persistPayload.ball_number,
      p_striker_player_id: persistPayload.striker_player_id ?? null,
      p_striker_name: persistPayload.striker_name,
      p_non_striker_player_id: persistPayload.non_striker_player_id ?? null,
      p_non_striker_name: persistPayload.non_striker_name,
      p_bowler_player_id: persistPayload.bowler_player_id ?? null,
      p_bowler_name: persistPayload.bowler_name,
      p_batter_runs: persistPayload.batter_runs,
      p_total_runs: persistPayload.total_runs,
      p_extras_runs: persistPayload.extras_runs,
      p_extra_type: persistPayload.extra_type,
      p_is_legal_delivery: persistPayload.is_legal_delivery,
      p_is_boundary: persistPayload.is_boundary,
      p_is_six: persistPayload.is_six,
      p_is_wicket: persistPayload.is_wicket,
      p_wicket_type: persistPayload.wicket_type,
      p_dismissed_player_id: persistPayload.dismissed_player_id ?? null,
      p_dismissed_player_name: persistPayload.dismissed_player_name ?? null,
      p_fielder_player_id: persistPayload.fielder_player_id ?? null,
      p_fielder_name: persistPayload.fielder_name ?? null,
      p_notes: persistPayload.notes ?? null,
    });

    if (error) {
      console.error(
        "[deliveries] upsert_delivery_idempotent:",
        error.code,
        error.message,
      );
      return NextResponse.json(
        { error: error.message, code: error.code ?? "rpc_error" },
        { status: 500 },
      );
    }

    const { data: matchRow } = await supabase
      .from("matches")
      .select("status, share_slug")
      .eq("id", session.matchId)
      .maybeSingle();
    if (
      matchRow?.status === "completed" &&
      typeof matchRow.share_slug === "string"
    ) {
      revalidatePath(`/match/${matchRow.share_slug}`);
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
      if (status === 403) {
        console.warn("[deliveries] 403", err.code, err.message);
      }
      return NextResponse.json(
        { error: err.message, code: err.code },
        { status },
      );
    }
    const message = err instanceof Error ? err.message : "Invalid request";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
