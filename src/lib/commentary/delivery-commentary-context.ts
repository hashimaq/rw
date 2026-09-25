import "server-only";

import {
  deliveryRowToInput,
  payloadToDeliveryInput,
} from "@/lib/mappers/delivery";
import {
  buildInningsStateFromDeliveries,
  liveSummary,
} from "@/lib/scoring-engine/build-state";
import type { Delivery } from "@/lib/database/types";
import type { DeliveryInputPayload } from "@/lib/validation/delivery";

export type DeliveryCommentaryContext = {
  matchId: string;
  clientEventId: string;
  inningsId: string;
  sequenceInInnings: number;
  overNumber: number;
  ballNumber: number;
  strikerName: string;
  nonStrikerName: string;
  bowlerName: string;
  batterRuns: number;
  extrasRuns: number;
  extraType: string;
  totalRuns: number;
  isLegalDelivery: boolean;
  isBoundary: boolean;
  isSix: boolean;
  isWicket: boolean;
  wicketType: string | null;
  dismissedPlayerName: string | null;
  teamTotalRuns: number;
  teamWickets: number;
  target: number | null;
  runsNeeded: number | null;
  ballsRemaining: number;
};

export function buildDeliveryCommentaryContext(
  matchId: string,
  payload: DeliveryInputPayload,
  existingRows: Delivery[],
  oversLimit: number,
  target: number | null,
): DeliveryCommentaryContext {
  const incoming = payloadToDeliveryInput(payload);
  const prior = (existingRows ?? []).map(deliveryRowToInput);
  const withoutDup = prior.filter(
    (d) => d.clientEventId !== payload.client_event_id,
  );
  const state = buildInningsStateFromDeliveries(
    [...withoutDup, incoming],
    oversLimit,
    target,
  );
  const summary = liveSummary(state);

  return {
    matchId,
    clientEventId: payload.client_event_id,
    inningsId: payload.innings_id,
    sequenceInInnings: payload.sequence_in_innings,
    overNumber: payload.over_number,
    ballNumber: payload.ball_number,
    strikerName: payload.striker_name,
    nonStrikerName: payload.non_striker_name,
    bowlerName: payload.bowler_name,
    batterRuns: payload.batter_runs,
    extrasRuns: payload.extras_runs,
    extraType: payload.extra_type,
    totalRuns: payload.total_runs,
    isLegalDelivery: payload.is_legal_delivery,
    isBoundary: payload.is_boundary,
    isSix: payload.is_six,
    isWicket: payload.is_wicket,
    wicketType: payload.wicket_type,
    dismissedPlayerName: payload.dismissed_player_name ?? null,
    teamTotalRuns: state.totalRuns,
    teamWickets: state.wickets,
    target,
    runsNeeded: summary.runsRequired ?? null,
    ballsRemaining: summary.ballsRemaining,
  };
}
