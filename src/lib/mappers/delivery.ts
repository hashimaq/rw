import type { Delivery } from "@/lib/database/types";
import { decodeNoBallRunKind } from "@/lib/scoring-engine/no-ball-run-kind";
import type { DeliveryInput } from "@/lib/scoring-engine/types";
import type { DeliveryInputPayload } from "@/lib/validation/delivery";

function enrichNoBallKind(input: DeliveryInput): DeliveryInput {
  const kind = decodeNoBallRunKind(input);
  return kind ? { ...input, noBallRunKind: kind } : input;
}

export function payloadToDeliveryInput(
  payload: DeliveryInputPayload,
): DeliveryInput {
  const base: DeliveryInput = {
    clientEventId: payload.client_event_id,
    sequenceInInnings: payload.sequence_in_innings,
    overNumber: payload.over_number,
    ballNumber: payload.ball_number,
    strikerPlayerId: payload.striker_player_id ?? null,
    strikerName: payload.striker_name,
    nonStrikerPlayerId: payload.non_striker_player_id ?? null,
    nonStrikerName: payload.non_striker_name,
    bowlerPlayerId: payload.bowler_player_id ?? null,
    bowlerName: payload.bowler_name,
    batterRuns: payload.batter_runs,
    totalRuns: payload.total_runs,
    extrasRuns: payload.extras_runs,
    extraType: payload.extra_type,
    isLegalDelivery: payload.is_legal_delivery,
    isBoundary: payload.is_boundary,
    isSix: payload.is_six,
    isWicket: payload.is_wicket,
    wicketType: payload.wicket_type,
    dismissedPlayerId: payload.dismissed_player_id ?? null,
    dismissedPlayerName: payload.dismissed_player_name ?? null,
    fielderPlayerId: payload.fielder_player_id ?? null,
    fielderName: payload.fielder_name ?? null,
    notes: payload.notes ?? null,
  };
  return enrichNoBallKind(base);
}

export function deliveryRowToInput(row: Delivery): DeliveryInput {
  const base: DeliveryInput = {
    clientEventId: row.client_event_id,
    sequenceInInnings: row.sequence_in_innings,
    overNumber: row.over_number,
    ballNumber: row.ball_number,
    strikerPlayerId: row.striker_player_id,
    strikerName: row.striker_name,
    nonStrikerPlayerId: row.non_striker_player_id,
    nonStrikerName: row.non_striker_name,
    bowlerPlayerId: row.bowler_player_id,
    bowlerName: row.bowler_name,
    batterRuns: row.batter_runs,
    totalRuns: row.total_runs,
    extrasRuns: row.extras_runs,
    extraType: row.extra_type,
    isLegalDelivery: row.is_legal_delivery,
    isBoundary: row.is_boundary,
    isSix: row.is_six,
    isWicket: row.is_wicket,
    wicketType: row.wicket_type,
    dismissedPlayerId: row.dismissed_player_id,
    dismissedPlayerName: row.dismissed_player_name,
    fielderPlayerId: row.fielder_player_id,
    fielderName: row.fielder_name,
    notes: row.notes,
  };
  return enrichNoBallKind(base);
}

export function deliveryInputToPayload(
  matchInningsId: string,
  input: DeliveryInput,
): DeliveryInputPayload {
  return {
    client_event_id: input.clientEventId,
    innings_id: matchInningsId,
    sequence_in_innings: input.sequenceInInnings,
    over_number: input.overNumber,
    ball_number: input.ballNumber,
    striker_player_id: input.strikerPlayerId,
    striker_name: input.strikerName,
    non_striker_player_id: input.nonStrikerPlayerId,
    non_striker_name: input.nonStrikerName,
    bowler_player_id: input.bowlerPlayerId,
    bowler_name: input.bowlerName,
    batter_runs: input.batterRuns,
    total_runs: input.totalRuns,
    extras_runs: input.extrasRuns,
    extra_type: input.extraType,
    is_legal_delivery: input.isLegalDelivery,
    is_boundary: input.isBoundary,
    is_six: input.isSix,
    is_wicket: input.isWicket,
    wicket_type: input.wicketType,
    dismissed_player_id: input.dismissedPlayerId,
    dismissed_player_name: input.dismissedPlayerName,
    fielder_player_id: input.fielderPlayerId,
    fielder_name: input.fielderName,
    notes: input.notes ?? null,
  };
}
