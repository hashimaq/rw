import type { InningsScoreState } from "@/lib/scoring-engine/types";
import { inningsIsComplete } from "@/lib/scoring-engine/build-state";
import { needsBowlerChange } from "@/lib/scoring-engine/delivery-builders";
import type { ParticipantRef } from "@/lib/scoring/participant";
import {
  syncCreaseRefsFromEngineState,
  wicketReplacementSlotFromDelivery,
  type WicketReplacementSlot,
} from "@/lib/scoring/crease-sync";

export type ScoringPhase =
  | "setup_openers"
  | "setup_bowler"
  | "need_bowler"
  | "need_batter"
  | "scoring"
  | "innings_complete"
  | "innings_saved"
  | "match_complete";

export function activeBattersAtCrease(state: InningsScoreState): number {
  const keys = new Set(
    [state.strikerKey, state.nonStrikerKey].filter(Boolean),
  );
  let count = 0;
  for (const key of keys) {
    const b = key ? state.batters[key] : null;
    if (b && !b.isOut) count += 1;
  }
  return count;
}

export interface DeriveScoringPhaseContext {
  inningsNumber: number;
  inningsStatus?: string;
}

/** Phase from authoritative innings state (deliveries + engine keys). */
export function deriveScoringPhase(
  state: InningsScoreState,
  ctx: DeriveScoringPhaseContext,
): ScoringPhase {
  if (state.deliveries.length === 0) return "setup_openers";
  if (inningsIsComplete(state)) {
    if (ctx.inningsNumber >= 2) return "match_complete";
    if (ctx.inningsStatus === "completed") return "innings_saved";
    return "innings_complete";
  }
  if (activeBattersAtCrease(state) < 2 && state.wickets < 10) {
    return "need_batter";
  }
  if (needsBowlerChange(state)) return "need_bowler";
  return "scoring";
}

/** Which crease end needs a replacement after the latest wicket delivery. */
export function wicketReplacementSlotFromEngineState(
  state: InningsScoreState,
): WicketReplacementSlot {
  if (activeBattersAtCrease(state) >= 2 || state.wickets >= 10) return null;

  const last = state.deliveries[state.deliveries.length - 1];
  if (last?.isWicket && last.wicketType !== "retired") {
    return wicketReplacementSlotFromDelivery(
      state,
      last.dismissedPlayerId,
      last.dismissedPlayerName,
    );
  }

  if (state.strikerKey) {
    const s = state.batters[state.strikerKey];
    if (s?.isOut) return "striker";
  }
  if (state.nonStrikerKey) {
    const ns = state.batters[state.nonStrikerKey];
    if (ns?.isOut) return "non_striker";
  }
  return null;
}

function bowlerRefFromEngineState(
  state: InningsScoreState,
): ParticipantRef | null {
  if (state.currentBowlerKey) {
    const b = state.bowlers[state.currentBowlerKey];
    if (b) {
      return { playerId: b.playerId, name: b.name };
    }
  }
  const last = state.deliveries[state.deliveries.length - 1];
  if (last?.bowlerName) {
    return { playerId: last.bowlerPlayerId, name: last.bowlerName };
  }
  return null;
}

export function participantRefsFromEngineState(state: InningsScoreState): {
  striker: ParticipantRef | null;
  nonStriker: ParticipantRef | null;
  bowler: ParticipantRef | null;
} {
  const crease = syncCreaseRefsFromEngineState(state);
  return {
    striker: crease.striker,
    nonStriker: crease.nonStriker,
    bowler: bowlerRefFromEngineState(state),
  };
}

/** Align hook UI fields after rebuilding innings state (undo / hydrate). */
export function scoringUiSnapshotFromEngineState(
  state: InningsScoreState,
  ctx: DeriveScoringPhaseContext,
): {
  phase: ScoringPhase;
  wicketReplacementSlot: WicketReplacementSlot;
  striker: ParticipantRef | null;
  nonStriker: ParticipantRef | null;
  bowler: ParticipantRef | null;
} {
  const phase = deriveScoringPhase(state, ctx);
  return {
    phase,
    wicketReplacementSlot:
      phase === "need_batter"
        ? wicketReplacementSlotFromEngineState(state)
        : null,
    ...participantRefsFromEngineState(state),
  };
}
