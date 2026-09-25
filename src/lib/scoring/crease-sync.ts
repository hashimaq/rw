import type { InningsScoreState } from "@/lib/scoring-engine/types";
import { participantKey } from "@/lib/scoring-engine/utils";
import type { ParticipantRef } from "@/lib/scoring/participant";
export function batterRefFromKey(
  state: InningsScoreState,
  key: string | null,
): ParticipantRef | null {
  if (!key) return null;
  const b = state.batters[key];
  if (!b || b.isOut) return null;
  return { playerId: b.playerId, name: b.name };
}

/** Sync hook crease refs from engine state after a delivery. */
export function syncCreaseRefsFromEngineState(
  state: InningsScoreState,
): { striker: ParticipantRef | null; nonStriker: ParticipantRef | null } {
  return {
    striker: batterRefFromKey(state, state.strikerKey),
    nonStriker: batterRefFromKey(state, state.nonStrikerKey),
  };
}

/**
 * Crease for scorer actions (wickets, manual striker) — engine keys when set,
 * otherwise hook refs before the first delivery is recorded.
 */
export function authoritativeCreaseRefs(
  state: InningsScoreState,
  pending: {
    striker: ParticipantRef | null;
    nonStriker: ParticipantRef | null;
  },
): { striker: ParticipantRef | null; nonStriker: ParticipantRef | null } {
  const fromEngine = syncCreaseRefsFromEngineState(state);
  if (fromEngine.striker && fromEngine.nonStriker) {
    return fromEngine;
  }
  if (state.deliveries.length === 0 && pending.striker && pending.nonStriker) {
    return {
      striker: pending.striker,
      nonStriker: pending.nonStriker,
    };
  }
  return {
    striker: fromEngine.striker,
    nonStriker: fromEngine.nonStriker,
  };
}

export type WicketReplacementSlot = "striker" | "non_striker" | null;

/** The single not-out batter at the crease during need_batter (end-of-over swap safe). */
export function soleActiveBatterAtCrease(
  state: InningsScoreState,
): ParticipantRef | null {
  let found: ParticipantRef | null = null;
  for (const key of [state.strikerKey, state.nonStrikerKey]) {
    if (!key) continue;
    const ref = batterRefFromKey(state, key);
    if (!ref) continue;
    if (found) return null;
    found = ref;
  }
  return found;
}

export function wicketReplacementSlotFromDelivery(
  state: InningsScoreState,
  dismissedPlayerId: string | null,
  dismissedPlayerName: string | null,
): WicketReplacementSlot {
  const dismissedKey = participantKey(
    dismissedPlayerId,
    dismissedPlayerName ?? "",
  );
  if (state.strikerKey === dismissedKey) return "striker";
  if (state.nonStrikerKey === dismissedKey) return "non_striker";
  return "striker";
}

export interface CreaseDisplayBatter {
  name: string;
  runs: number;
  balls: number;
  fours: number;
  sixes: number;
  is_striker: boolean;
  isOut: boolean;
  dismissalLabel: string | null;
  pending: boolean;
}

export function deriveCreaseDisplay(
  state: InningsScoreState,
  engineStrikerKey: string | null,
  replacementSlot: WicketReplacementSlot,
  phaseNeedsBatter: boolean,
): { striker: CreaseDisplayBatter | null; nonStriker: CreaseDisplayBatter | null } {
  /** End-of-crease rows map to engine strikerKey / nonStrikerKey (source of truth). */
  const build = (
    key: string | null,
    end: "striker_end" | "non_striker_end",
  ): CreaseDisplayBatter | null => {
    const isStrikerRole = end === "striker_end";
    if (!key) {
      if (phaseNeedsBatter && replacementSlot === (isStrikerRole ? "striker" : "non_striker")) {
        return {
          name: "Select batter",
          runs: 0,
          balls: 0,
          fours: 0,
          sixes: 0,
          is_striker: isStrikerRole,
          isOut: false,
          dismissalLabel: null,
          pending: true,
        };
      }
      return null;
    }
    const b = state.batters[key];
    if (!b) return null;
    const pending =
      phaseNeedsBatter &&
      b.isOut &&
      replacementSlot === (isStrikerRole ? "striker" : "non_striker");
    if (b.isOut && !pending) {
      return null;
    }
    const onStrike = engineStrikerKey === key && !b.isOut;
    return {
      name: b.name,
      runs: b.runs,
      balls: b.balls,
      fours: b.fours,
      sixes: b.sixes,
      is_striker: isStrikerRole ? onStrike : false,
      isOut: b.isOut,
      dismissalLabel: b.dismissalLabel,
      pending,
    };
  };

  return {
    striker: build(state.strikerKey, "striker_end"),
    nonStriker: build(state.nonStrikerKey, "non_striker_end"),
  };
}
