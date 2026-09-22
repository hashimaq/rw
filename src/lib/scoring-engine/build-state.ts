import type {
  DeliveryInput,
  ExtrasBreakdown,
  InningsScoreState,
  PartnershipState,
} from "./types";
import { formatBattingDismissal } from "@/lib/scorecard/format-dismissal";
import {
  oversFromLegalBalls,
  participantKey,
  requiredRunRate,
  runRate,
} from "./utils";

function emptyExtrasBreakdown(): ExtrasBreakdown {
  return { wides: 0, noBalls: 0, byes: 0, legByes: 0, penalty: 0 };
}

export function createEmptyInningsState(
  oversLimit: number,
  target: number | null = null,
): InningsScoreState {
  return {
    totalRuns: 0,
    wickets: 0,
    legalBalls: 0,
    extras: 0,
    extrasBreakdown: emptyExtrasBreakdown(),
    strikerKey: null,
    nonStrikerKey: null,
    currentBowlerKey: null,
    batters: {},
    bowlers: {},
    partnerships: [],
    activePartnership: null,
    fallOfWickets: [],
    deliveries: [],
    recentDeliveries: [],
    target,
    oversLimit,
    runsInCurrentOver: 0,
  };
}

function ensureBatter(
  state: InningsScoreState,
  playerId: string | null,
  name: string,
) {
  const key = participantKey(playerId, name);
  if (!state.batters[key]) {
    state.batters[key] = {
      key,
      playerId,
      name,
      runs: 0,
      balls: 0,
      fours: 0,
      sixes: 0,
      isOut: false,
      dismissalLabel: null,
    };
  }
  return state.batters[key];
}

function ensureBowler(
  state: InningsScoreState,
  playerId: string | null,
  name: string,
) {
  const key = participantKey(playerId, name);
  if (!state.bowlers[key]) {
    state.bowlers[key] = {
      key,
      playerId,
      name,
      legalBalls: 0,
      runsConceded: 0,
      wickets: 0,
      maidens: 0,
      widesBowled: 0,
      noBallsBowled: 0,
    };
  }
  return state.bowlers[key];
}

function swapStrikerNonStriker(state: InningsScoreState) {
  const tmp = state.strikerKey;
  state.strikerKey = state.nonStrikerKey;
  state.nonStrikerKey = tmp;
}

function rotateStrike(state: InningsScoreState, runs: number) {
  if (runs % 2 === 1) {
    swapStrikerNonStriker(state);
  }
}

function startPartnership(
  state: InningsScoreState,
  strikerKey: string,
  nonStrikerKey: string,
) {
  const b1 = state.batters[strikerKey];
  const b2 = state.batters[nonStrikerKey];
  if (!b1 || !b2) return;

  const partnership: PartnershipState = {
    partnershipNumber: state.partnerships.length + 1,
    batter1Key: strikerKey,
    batter1Name: b1.name,
    batter2Key: nonStrikerKey,
    batter2Name: b2.name,
    runs: 0,
    balls: 0,
    startScore: state.totalRuns,
  };
  state.activePartnership = partnership;
}

function endActivePartnership(state: InningsScoreState) {
  if (!state.activePartnership) return;
  state.partnerships.push({ ...state.activePartnership });
  state.activePartnership = null;
}

function bowlerRunsCharged(delivery: DeliveryInput): number {
  if (delivery.extraType === "bye" || delivery.extraType === "leg_bye") {
    return 0;
  }
  if (delivery.extraType === "wide" || delivery.extraType === "no_ball") {
    return delivery.totalRuns;
  }
  return delivery.batterRuns;
}

function bowlerGetsWicket(delivery: DeliveryInput): boolean {
  if (!delivery.isWicket) return false;
  const wt = delivery.wicketType;
  if (!wt || wt === "run_out" || wt === "retired" || wt === "other") {
    return false;
  }
  return true;
}

function countsAsWicket(delivery: DeliveryInput): boolean {
  return delivery.isWicket && delivery.wicketType !== "retired";
}

function applyExtrasBreakdown(
  breakdown: ExtrasBreakdown,
  delivery: DeliveryInput,
) {
  switch (delivery.extraType) {
    case "wide":
      breakdown.wides += delivery.extrasRuns;
      break;
    case "no_ball":
      breakdown.noBalls += delivery.extrasRuns;
      break;
    case "bye":
      breakdown.byes += delivery.extrasRuns;
      break;
    case "leg_bye":
      breakdown.legByes += delivery.extrasRuns;
      break;
    case "penalty":
      breakdown.penalty += delivery.extrasRuns;
      break;
    default:
      break;
  }
}

function strikeRotationRuns(delivery: DeliveryInput): number {
  if (delivery.isLegalDelivery) {
    if (
      delivery.extraType === "bye" ||
      delivery.extraType === "leg_bye"
    ) {
      return delivery.totalRuns;
    }
    return delivery.batterRuns;
  }
  if (
    delivery.extraType === "wide" ||
    delivery.extraType === "no_ball"
  ) {
    return delivery.totalRuns;
  }
  return 0;
}

export function applyDeliveryToState(
  state: InningsScoreState,
  delivery: DeliveryInput,
): InningsScoreState {
  const next = structuredClone(state);

  const strikerKey = participantKey(
    delivery.strikerPlayerId,
    delivery.strikerName,
  );
  const nonStrikerKey = participantKey(
    delivery.nonStrikerPlayerId,
    delivery.nonStrikerName,
  );
  const bowlerKey = participantKey(
    delivery.bowlerPlayerId,
    delivery.bowlerName,
  );

  next.strikerKey = strikerKey;
  next.nonStrikerKey = nonStrikerKey;
  next.currentBowlerKey = bowlerKey;

  ensureBatter(next, delivery.strikerPlayerId, delivery.strikerName);
  ensureBatter(next, delivery.nonStrikerPlayerId, delivery.nonStrikerName);
  ensureBowler(next, delivery.bowlerPlayerId, delivery.bowlerName);

  if (!next.activePartnership) {
    startPartnership(next, strikerKey, nonStrikerKey);
  }

  const isDeadBall =
    delivery.notes === "dead_ball" ||
    (delivery.totalRuns === 0 &&
      !delivery.isLegalDelivery &&
      delivery.extraType === "none" &&
      !delivery.isWicket);

  if (!isDeadBall) {
    next.totalRuns += delivery.totalRuns;
    if (delivery.extrasRuns > 0) {
      next.extras += delivery.extrasRuns;
      applyExtrasBreakdown(next.extrasBreakdown, delivery);
    }
  }

  const striker = next.batters[strikerKey];
  const bowler = next.bowlers[bowlerKey];

  const legalBefore = next.legalBalls;

  if (delivery.isLegalDelivery) {
    next.legalBalls += 1;
    striker.balls += 1;
    bowler.legalBalls += 1;
    if (next.activePartnership) {
      next.activePartnership.balls += 1;
    }
  }

  if (!isDeadBall) {
    if (delivery.extraType === "wide") {
      bowler.widesBowled += 1;
    } else if (delivery.extraType === "no_ball") {
      bowler.noBallsBowled += 1;
    }

    striker.runs += delivery.batterRuns;
    const charged = bowlerRunsCharged(delivery);
    bowler.runsConceded += charged;
    next.runsInCurrentOver += charged;

    if (delivery.isBoundary && delivery.batterRuns === 4) striker.fours += 1;
    if (delivery.isSix) striker.sixes += 1;

    if (next.activePartnership) {
      next.activePartnership.runs += delivery.totalRuns;
    }
  }

  if (countsAsWicket(delivery)) {
    next.wickets += 1;
    if (bowlerGetsWicket(delivery)) {
      bowler.wickets += 1;
    }

    const dismissedKey = participantKey(
      delivery.dismissedPlayerId,
      delivery.dismissedPlayerName ??
        (delivery.dismissedPlayerId ? "" : delivery.strikerName),
    );
    const dismissed =
      next.batters[dismissedKey] ??
      ensureBatter(
        next,
        delivery.dismissedPlayerId,
        delivery.dismissedPlayerName ?? delivery.strikerName,
      );
    dismissed.isOut = true;
    dismissed.dismissalLabel = formatBattingDismissal({
      wicketType: delivery.wicketType,
      bowlerName: delivery.bowlerName,
      fielderName: delivery.fielderName,
    });

    next.fallOfWickets.push({
      wicketNumber: next.wickets,
      scoreAtWicket: next.totalRuns,
      dismissedPlayerId: delivery.dismissedPlayerId,
      dismissedPlayerName:
        delivery.dismissedPlayerName ?? dismissed.name,
      overNumber: delivery.overNumber,
      ballNumber: delivery.ballNumber,
    });
    endActivePartnership(next);
  } else if (delivery.isWicket && delivery.wicketType === "retired") {
    const dismissedKey = participantKey(
      delivery.dismissedPlayerId,
      delivery.dismissedPlayerName ?? delivery.strikerName,
    );
    const dismissed =
      next.batters[dismissedKey] ??
      ensureBatter(
        next,
        delivery.dismissedPlayerId,
        delivery.dismissedPlayerName ?? delivery.strikerName,
      );
    dismissed.isOut = true;
    dismissed.dismissalLabel = "retired";
    endActivePartnership(next);
  }

  if (!isDeadBall) {
    rotateStrike(next, strikeRotationRuns(delivery));
  }

  if (delivery.isLegalDelivery && next.legalBalls % 6 === 0) {
    swapStrikerNonStriker(next);
    if (next.runsInCurrentOver === 0 && legalBefore < next.legalBalls) {
      bowler.maidens += 1;
    }
    next.runsInCurrentOver = 0;
  }

  if (
    countsAsWicket(delivery) &&
    next.strikerKey &&
    next.nonStrikerKey &&
    next.wickets < 10
  ) {
    const s = next.batters[next.strikerKey];
    const ns = next.batters[next.nonStrikerKey];
    if (s && ns && !s.isOut && !ns.isOut) {
      startPartnership(next, next.strikerKey, next.nonStrikerKey);
    }
  }

  next.deliveries = [...next.deliveries, delivery];
  next.recentDeliveries = [...next.recentDeliveries, delivery].slice(-12);

  return next;
}

export function buildInningsStateFromDeliveries(
  deliveries: DeliveryInput[],
  oversLimit: number,
  target: number | null = null,
): InningsScoreState {
  let state = createEmptyInningsState(oversLimit, target);
  const sorted = [...deliveries].sort(
    (a, b) => a.sequenceInInnings - b.sequenceInInnings,
  );
  for (const d of sorted) {
    state = applyDeliveryToState(state, d);
  }
  return state;
}

export function undoLastDelivery(
  state: InningsScoreState,
): InningsScoreState | null {
  if (state.deliveries.length === 0) return null;
  const remaining = state.deliveries.slice(0, -1);
  const target = state.target;
  const oversLimit = state.oversLimit;
  return buildInningsStateFromDeliveries(remaining, oversLimit, target);
}

export function inningsIsComplete(state: InningsScoreState): boolean {
  const maxBalls = state.oversLimit * 6;
  if (state.wickets >= 10) return true;
  if (state.legalBalls >= maxBalls) return true;
  if (
    state.target != null &&
    state.totalRuns >= state.target &&
    state.deliveries.length > 0
  ) {
    return true;
  }
  return false;
}

export function liveSummary(state: InningsScoreState) {
  const maxBalls = state.oversLimit * 6;
  const ballsRemaining = Math.max(maxBalls - state.legalBalls, 0);
  const crr =
    state.legalBalls > 0
      ? runRate(state.totalRuns, state.legalBalls)
      : null;

  let required: number | null = null;
  let rrr: number | null = null;
  const isChase = state.target != null;

  if (isChase) {
    required = Math.max(state.target! - state.totalRuns, 0);
    if (ballsRemaining > 0) {
      rrr = requiredRunRate(required, ballsRemaining);
      if (!Number.isFinite(rrr)) rrr = null;
    } else {
      rrr = required > 0 ? null : 0;
    }
  }

  const chaseComplete =
    isChase &&
    state.deliveries.length > 0 &&
    state.totalRuns >= state.target!;

  const currentOverNumber = Math.floor(state.legalBalls / 6);
  const ballsInCurrentOver = state.deliveries.filter(
    (d) => d.overNumber === currentOverNumber,
  );

  return {
    totalRuns: state.totalRuns,
    wickets: state.wickets,
    legalBalls: state.legalBalls,
    oversDisplay: oversFromLegalBalls(state.legalBalls),
    runRate: crr ?? 0,
    crr,
    extras: state.extras,
    extrasBreakdown: state.extrasBreakdown,
    target: state.target,
    runsRequired: required,
    ballsRemaining,
    requiredRunRate: rrr,
    isChaseInnings: isChase,
    chaseComplete,
    striker: state.strikerKey ? state.batters[state.strikerKey] : null,
    nonStriker: state.nonStrikerKey
      ? state.batters[state.nonStrikerKey]
      : null,
    bowler: state.currentBowlerKey
      ? state.bowlers[state.currentBowlerKey]
      : null,
    partnership: state.activePartnership,
    recentDeliveries: state.recentDeliveries,
    currentOverDeliveries: ballsInCurrentOver,
    inningsComplete: inningsIsComplete(state),
  };
}
