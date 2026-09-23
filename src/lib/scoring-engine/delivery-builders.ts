import type { ExtraType, WicketType } from "@/lib/database/types";
import {
  isWicketTypeAllowedOnExtra,
  wicketOnExtraRejectionMessage,
} from "@/lib/scoring/wicket-legality";
import type { DeliveryInput, InningsScoreState } from "./types";
import { assertDeliveryRunInvariant } from "./delivery-run-components";
import { encodeNoBallRunKindNote } from "./no-ball-run-kind";
import { participantKey } from "./utils";

function finalizeDelivery(d: DeliveryInput): DeliveryInput {
  if (d.notes !== "dead_ball") {
    assertDeliveryRunInvariant(d);
  }
  return d;
}

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
  return finalizeDelivery(
    baseDelivery(state, participants, clientEventId, true, {
      batterRuns: runs,
      totalRuns: runs,
      isBoundary: runs === 4,
      isSix: runs === 6,
    }),
  );
}

export function buildWideDelivery(
  state: InningsScoreState,
  participants: ActiveParticipants,
  clientEventId: string,
  additionalWideRuns = 0,
): DeliveryInput {
  /** Wide penalty (1) plus any runs completed on the delivery — all extras, 0 to batter. */
  const extrasRuns = 1 + additionalWideRuns;
  return finalizeDelivery(
    baseDelivery(state, participants, clientEventId, false, {
      extraType: "wide",
      extrasRuns,
      batterRuns: 0,
      totalRuns: extrasRuns,
    }),
  );
}

export type NoBallRunKind = "bat" | "bye" | "leg_bye" | "none";

export function buildNoBallDelivery(
  state: InningsScoreState,
  participants: ActiveParticipants,
  clientEventId: string,
  options: {
    kind: NoBallRunKind;
    additionalRuns?: number;
  },
): DeliveryInput {
  const additional = options.additionalRuns ?? 0;
  const batterRuns = options.kind === "bat" ? additional : 0;
  const extrasRuns = 1 + (options.kind === "bat" ? 0 : additional);
  const totalRuns = 1 + additional;
  return finalizeDelivery(
    baseDelivery(state, participants, clientEventId, false, {
      extraType: "no_ball",
      extrasRuns,
      batterRuns,
      totalRuns,
      noBallRunKind: options.kind,
      notes: encodeNoBallRunKindNote(options.kind),
      isBoundary: batterRuns === 4,
      isSix: batterRuns === 6,
    }),
  );
}

export function buildByeDelivery(
  state: InningsScoreState,
  participants: ActiveParticipants,
  clientEventId: string,
  runs: number,
): DeliveryInput {
  return finalizeDelivery(
    baseDelivery(state, participants, clientEventId, true, {
      extraType: "bye",
      extrasRuns: runs,
      totalRuns: runs,
    }),
  );
}

export function buildLegByeDelivery(
  state: InningsScoreState,
  participants: ActiveParticipants,
  clientEventId: string,
  runs: number,
): DeliveryInput {
  return finalizeDelivery(
    baseDelivery(state, participants, clientEventId, true, {
      extraType: "leg_bye",
      extrasRuns: runs,
      totalRuns: runs,
    }),
  );
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

/** Manual scorer crease correction — replayable, no scoring side effects. */
export function buildCreaseCorrectionDelivery(
  state: InningsScoreState,
  participants: ActiveParticipants,
  clientEventId: string,
): DeliveryInput {
  return baseDelivery(state, participants, clientEventId, false, {
    notes: "crease_correction",
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

export interface ExtraWicketOptions {
  wicketType: WicketType;
  dismissedPlayerId: string | null;
  dismissedPlayerName: string;
  fielderPlayerId?: string | null;
  fielderName?: string | null;
}

function assertExtraWicket(wicketType: WicketType, extraType: ExtraType) {
  if (!isWicketTypeAllowedOnExtra(wicketType, extraType)) {
    throw new Error(wicketOnExtraRejectionMessage(wicketType, extraType));
  }
}

/** No-ball + runs + wicket on the same delivery (engine; scorer UI records extras separately today). */
export function buildNoBallWicketDelivery(
  state: InningsScoreState,
  participants: ActiveParticipants,
  clientEventId: string,
  options: {
    kind: NoBallRunKind;
    additionalRuns?: number;
  } & ExtraWicketOptions,
): DeliveryInput {
  assertExtraWicket(options.wicketType, "no_ball");
  const additional = options.additionalRuns ?? 0;
  const batterRuns = options.kind === "bat" ? additional : 0;
  const extrasRuns = 1 + (options.kind === "bat" ? 0 : additional);
  const totalRuns = 1 + additional;
  return finalizeDelivery(
    baseDelivery(state, participants, clientEventId, false, {
      extraType: "no_ball",
      extrasRuns,
      batterRuns,
      totalRuns,
      noBallRunKind: options.kind,
      notes: encodeNoBallRunKindNote(options.kind),
      isBoundary: batterRuns === 4,
      isSix: batterRuns === 6,
      isWicket: true,
      wicketType: options.wicketType,
      dismissedPlayerId: options.dismissedPlayerId,
      dismissedPlayerName: options.dismissedPlayerName,
      fielderPlayerId: options.fielderPlayerId ?? null,
      fielderName: options.fielderName ?? null,
    }),
  );
}

/** Wide + completed runs + wicket on the same delivery. */
export function buildWideWicketDelivery(
  state: InningsScoreState,
  participants: ActiveParticipants,
  clientEventId: string,
  additionalWideRuns: number,
  options: ExtraWicketOptions,
): DeliveryInput {
  assertExtraWicket(options.wicketType, "wide");
  const extrasRuns = 1 + additionalWideRuns;
  return finalizeDelivery(
    baseDelivery(state, participants, clientEventId, false, {
      extraType: "wide",
      extrasRuns,
      batterRuns: 0,
      totalRuns: extrasRuns,
      isWicket: true,
      wicketType: options.wicketType,
      dismissedPlayerId: options.dismissedPlayerId,
      dismissedPlayerName: options.dismissedPlayerName,
      fielderPlayerId: options.fielderPlayerId ?? null,
      fielderName: options.fielderName ?? null,
    }),
  );
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

  return finalizeDelivery(
    baseDelivery(state, participants, clientEventId, isLegal, {
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
    }),
  );
}

export function needsBowlerChange(state: InningsScoreState): boolean {
  if (state.legalBalls === 0 || state.legalBalls % 6 !== 0) return false;
  const lastOverBowlerKey = lastBowlerKey(state);
  if (!lastOverBowlerKey) return false;
  if (!state.currentBowlerKey) return true;
  return state.currentBowlerKey === lastOverBowlerKey;
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
