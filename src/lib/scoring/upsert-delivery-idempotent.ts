import "server-only";

import type { createServiceRoleClient } from "@/lib/supabase/admin";
import type { DeliveryInputPayload } from "@/lib/validation/delivery";

type AdminClient = ReturnType<typeof createServiceRoleClient>;

export function isInningsSequenceUniqueViolation(error: {
  code?: string | null;
  message?: string;
}): boolean {
  return (
    error.code === "23505" &&
    (error.message?.includes("deliveries_innings_sequence_unique") ?? false)
  );
}

function rpcArgs(payload: DeliveryInputPayload) {
  return {
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
  };
}

async function callUpsertRpc(
  supabase: AdminClient,
  payload: DeliveryInputPayload,
): Promise<{ deliveryId: string | null; error: { code?: string; message: string } | null }> {
  const { data, error } = await supabase.rpc(
    "upsert_delivery_idempotent",
    rpcArgs(payload),
  );
  if (error) {
    return { deliveryId: null, error: { code: error.code, message: error.message } };
  }
  return { deliveryId: data as string, error: null };
}

/**
 * Idempotent delivery upsert. Handles duplicate (innings_id, sequence_in_innings)
 * when the occupant is the last delivery (local undo + rescore race).
 */
export async function upsertDeliveryIdempotentWithRecovery(
  supabase: AdminClient,
  payload: DeliveryInputPayload,
): Promise<
  | { ok: true; deliveryId: string }
  | {
      ok: false;
      status: number;
      code: string;
      message: string;
      occupantClientEventId?: string;
    }
> {
  let result = await callUpsertRpc(supabase, payload);
  if (!result.error && result.deliveryId) {
    return { ok: true, deliveryId: result.deliveryId };
  }
  if (!result.error) {
    return {
      ok: false,
      status: 500,
      code: "rpc_error",
      message: "Delivery upsert returned no id",
    };
  }

  if (!isInningsSequenceUniqueViolation(result.error)) {
    return {
      ok: false,
      status: 500,
      code: result.error.code ?? "rpc_error",
      message: result.error.message,
    };
  }

  const { data: occupant, error: occupantError } = await supabase
    .from("deliveries")
    .select("id, client_event_id")
    .eq("innings_id", payload.innings_id)
    .eq("sequence_in_innings", payload.sequence_in_innings)
    .maybeSingle();

  if (occupantError || !occupant) {
    return {
      ok: false,
      status: 500,
      code: result.error.code ?? "23505",
      message: result.error.message,
    };
  }

  if (occupant.client_event_id === payload.client_event_id) {
    return { ok: true, deliveryId: occupant.id };
  }

  const { data: lastDelivery, error: lastError } = await supabase
    .from("deliveries")
    .select("client_event_id")
    .eq("innings_id", payload.innings_id)
    .order("sequence_in_innings", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (lastError || !lastDelivery) {
    return {
      ok: false,
      status: 500,
      code: "sequence_conflict",
      message: result.error.message,
    };
  }

  if (lastDelivery.client_event_id !== occupant.client_event_id) {
    return {
      ok: false,
      status: 409,
      code: "sequence_conflict",
      message:
        "This innings sequence is already used by another delivery. Undo on the server or re-sync.",
      occupantClientEventId: occupant.client_event_id,
    };
  }

  const { error: deleteError } = await supabase
    .from("deliveries")
    .delete()
    .eq("id", occupant.id);

  if (deleteError) {
    return {
      ok: false,
      status: 500,
      code: "sequence_replace_failed",
      message: deleteError.message,
    };
  }

  result = await callUpsertRpc(supabase, payload);
  if (!result.error && result.deliveryId) {
    return { ok: true, deliveryId: result.deliveryId };
  }

  return {
    ok: false,
    status: 500,
    code: result.error?.code ?? "rpc_error",
    message: result.error?.message ?? "Delivery upsert failed after sequence recovery",
  };
}
