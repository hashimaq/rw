import type { ExtraType, WicketType } from "@/lib/database/types";
import type { DeliveryInput, InningsScoreState } from "./types";
import { participantKey } from "./utils";

export interface ActiveParticipants {
  strikerPlayerId: string | null;
  strikerName: string;
  nonStrikerPlayerId: string | null;
  nonStrikerName: string;
  bowlerPlayerId: string | null;
  bowlerName: string;
}

export function nextSequence(state: InningsScoreState): number {
  return state.deliveries.length + 1;
}

/** Over/ball numbers for the delivery about to be recorded. */
export function nextDeliveryNumbers(
  state: InningsScoreState,
  isLegal: boolean,
): { overNumber: number; ballNumber: number } {
  const overNumber = Math.floor(state.legalBalls / 6);
  if (isLegal) {
    return {
      overNumber,
      ballNumber: (state.legalBalls % 6) + 1,
    };
  }
  const mod = state.legalBalls % 6;
  return {
    overNumber,
    ballNumber: mod === 0 ? 1 : mod + 1,
  };
}

function baseDelivery(
  state: InningsScoreState,
  participants: ActiveParticipants,
  clientEventId: string,
  isLegal: boolean,
  fields: Partial<DeliveryInput>,
): DeliveryInput {
  const { overNumber, ballNumber } = nextDeliveryNumbers(state, isLegal);
  return {
    clientEventId,
    sequenceInInnings: nextSequence(state),
    overNumber,
    ballNumber,
    strikerPlayerId: participants.strikerPlayerId,
    strikerName: participants.strikerName,
    nonStrikerPlayerId: participants.nonStrikerPlayerId,
    nonStrikerName: participants.nonStrikerName,
    bowlerPlayerId: participants.bowlerPlayerId,
    bowlerName: participants.bowlerName,
    batterRuns: 0,
    totalRuns: 0,
    extrasRuns: 0,
    extraType: "none",
    isLegalDelivery: isLegal,
    isBoundary: false,
    isSix: false,
    isWicket: false,
    wicketType: null,
    dismissedPlayerId: null,
    dismissedPlayerName: null,
    fielderPlayerId: null,
    fielderName: null,
    notes: null,
    ...fields,
  };
}

export function buildNormalRunDelivery(
  state: InningsScoreState,
  participants: ActiveParticipants,
  clientEventId: string,
  runs: number,
): DeliveryInput {
  return baseDelivery(state, participants, clientEventId, true, {
    batterRuns: runs,
    totalRuns: runs,
    isBoundary: runs === 4,
    isSix: runs === 6,
  });
}

export function buildWideDelivery(
  state: InningsScoreState,
  participants: ActiveParticipants,
  clientEventId: string,
  additionalRuns = 0,
): DeliveryInput {
  const extrasRuns = 1 + additionalRuns;
  return baseDelivery(state, participants, clientEventId, false, {
    extraType: "wide",
    extrasRuns,
    totalRuns: extrasRuns,
  });
}

export function buildNoBallDelivery(
  state: InningsScoreState,
  participants: ActiveParticipants,
  clientEventId: string,
  batterRuns: number,
): DeliveryInput {
  const extrasRuns = 1;
  const totalRuns = extrasRuns + batterRuns;
  return baseDelivery(state, participants, clientEventId, false, {
    extraType: "no_ball",
    extrasRuns,
    batterRuns,
    totalRuns,
    isBoundary: batterRuns === 4,
    isSix: batterRuns === 6,
  });
}

export function buildByeDelivery(
  state: InningsScoreState,
  participants: ActiveParticipants,
  clientEventId: string,
  runs: number,
): DeliveryInput {
  return baseDelivery(state, participants, clientEventId, true, {
    extraType: "bye",
    extrasRuns: runs,
    totalRuns: runs,
  });
}

export function buildLegByeDelivery(
  state: InningsScoreState,
  participants: ActiveParticipants,
  clientEventId: string,
  runs: number,
): DeliveryInput {
  return baseDelivery(state, participants, clientEventId, true, {
    extraType: "leg_bye",
    extrasRuns: runs,
    totalRuns: runs,
  });
}

export function buildDeadBallDelivery(
  state: InningsScoreState,
  participants: ActiveParticipants,
  clientEventId: string,
): DeliveryInput {
  return baseDelivery(state, participants, clientEventId, false, {
    notes: "dead_ball",
  });
}

export interface WicketDeliveryOptions {
  wicketType: WicketType;
  dismissedPlayerId: string | null;
  dismissedPlayerName: string;
  fielderPlayerId?: string | null;
  fielderName?: string | null;
  batterRuns?: number;
  extraType?: ExtraType;
  extrasRuns?: number;
  isLegalDelivery?: boolean;
}

export function buildWicketDelivery(
  state: InningsScoreState,
  participants: ActiveParticipants,
  clientEventId: string,
  options: WicketDeliveryOptions,
): DeliveryInput {
  const batterRuns = options.batterRuns ?? 0;
  const extrasRuns = options.extrasRuns ?? 0;
  const extraType = options.extraType ?? "none";
  const isLegal = options.isLegalDelivery ?? true;
  const totalRuns = batterRuns + extrasRuns;

  return baseDelivery(state, participants, clientEventId, isLegal, {
    batterRuns,
    extrasRuns,
    extraType,
    totalRuns,
    isWicket: true,
    wicketType: options.wicketType,
    dismissedPlayerId: options.dismissedPlayerId,
    dismissedPlayerName: options.dismissedPlayerName,
    fielderPlayerId: options.fielderPlayerId ?? null,
    fielderName: options.fielderName ?? null,
    isBoundary: batterRuns === 4,
    isSix: batterRuns === 6,
  });
}

export function needsBowlerChange(state: InningsScoreState): boolean {
  return state.legalBalls > 0 && state.legalBalls % 6 === 0;
}

export function lastBowlerKey(state: InningsScoreState): string | null {
  for (let i = state.deliveries.length - 1; i >= 0; i -= 1) {
    const d = state.deliveries[i];
    if (d.isLegalDelivery) {
      return participantKey(d.bowlerPlayerId, d.bowlerName);
    }
  }
  return null;
}
