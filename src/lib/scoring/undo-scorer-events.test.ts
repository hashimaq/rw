import { describe, expect, it } from "vitest";
import {
  applyDeliveryToState,
  createEmptyInningsState,
} from "@/lib/scoring-engine/build-state";
import {
  buildCreaseCorrectionDelivery,
  buildWicketDelivery,
  type ActiveParticipants,
} from "@/lib/scoring-engine/delivery-builders";
import { participantKey } from "@/lib/scoring-engine/utils";
import { deriveCreaseDisplay } from "@/lib/scoring/crease-sync";
import { liveCreaseBatterForEnd } from "@/lib/scoring/live-crease-display";
import {
  deriveScoringPhase,
  scoringUiSnapshotFromEngineState,
  wicketReplacementSlotFromEngineState,
} from "@/lib/scoring/scoring-phase";
import { undoLastScorerEvents } from "@/lib/scoring/undo-scorer-events";

const AMIR = "11111111-1111-4111-8111-111111111111";
const B = "22222222-2222-4222-8222-222222222222";
const RAZA = "33333333-3333-4333-8333-333333333333";
const X = "44444444-4444-4444-8444-444444444444";

const openers: ActiveParticipants = {
  strikerPlayerId: AMIR,
  strikerName: "Amir",
  nonStrikerPlayerId: B,
  nonStrikerName: "B",
  bowlerPlayerId: X,
  bowlerName: "X",
};

const ctx = { inningsNumber: 1 as const };
const amirKey = participantKey(AMIR, "Amir");

function pendingRow(name: string) {
  return {
    name,
    runs: 0,
    balls: 0,
    fours: 0,
    sixes: 0,
    is_striker: true,
    isOut: false,
    dismissalLabel: null,
    pending: false,
  };
}

function creaseFromKey(
  state: ReturnType<typeof createEmptyInningsState>,
  key: string,
  onStrike: boolean,
) {
  const b = state.batters[key]!;
  return {
    name: b.name,
    runs: b.runs,
    balls: b.balls,
    fours: b.fours,
    sixes: b.sixes,
    is_striker: onStrike,
    isOut: b.isOut,
    dismissalLabel: b.dismissalLabel,
    pending: false,
  };
}

describe("beta: Amir wicket → Raza replacement → Undo", () => {
  it.each([
    ["bowled", {}],
    ["caught", { fielderName: "F" }],
    ["lbw", {}],
    ["hit_wicket", {}],
    ["stumped", { fielderName: "WK" }],
  ] as const)(
    "%s restores pre-wicket state in one undo",
    (wicketType, extra) => {
      let s = createEmptyInningsState(20);
      s = applyDeliveryToState(
        s,
        buildCreaseCorrectionDelivery(s, openers, "openers"),
      );
      s = applyDeliveryToState(
        s,
        buildWicketDelivery(s, openers, "w1", {
          wicketType,
          dismissedPlayerId: AMIR,
          dismissedPlayerName: "Amir",
          ...extra,
        }),
      );
      s = applyDeliveryToState(
        s,
        buildCreaseCorrectionDelivery(
          s,
          { ...openers, strikerPlayerId: RAZA, strikerName: "Raza" },
          "replace",
        ),
      );
      const undone = undoLastScorerEvents(s)!;
      expect(undone.removed).toHaveLength(2);
      expect(scoringUiSnapshotFromEngineState(undone.next, ctx).phase).toBe(
        "scoring",
      );
      expect(undone.next.wickets).toBe(0);
      expect(undone.next.batters[amirKey].isOut).toBe(false);
    },
  );

  it("restores complete pre-wicket authoritative + UI snapshot in one undo", () => {
    let s = createEmptyInningsState(20);
    s = applyDeliveryToState(
      s,
      buildCreaseCorrectionDelivery(s, openers, "openers"),
    );
    s = applyDeliveryToState(
      s,
      buildWicketDelivery(s, openers, "w1", {
        wicketType: "bowled",
        dismissedPlayerId: AMIR,
        dismissedPlayerName: "Amir",
      }),
    );
    s = applyDeliveryToState(
      s,
      buildCreaseCorrectionDelivery(
        s,
        {
          ...openers,
          strikerPlayerId: RAZA,
          strikerName: "Raza",
        },
        "replace",
      ),
    );

    const undone = undoLastScorerEvents(s)!;
    expect(undone.removed).toHaveLength(2);
    const state = undone.next;

    const snap = scoringUiSnapshotFromEngineState(state, ctx);
    expect(snap.phase).toBe("scoring");
    expect(snap.wicketReplacementSlot).toBeNull();
    expect(state.wickets).toBe(0);
    expect(state.fallOfWickets).toHaveLength(0);
    expect(state.batters[amirKey].isOut).toBe(false);
    expect(state.batters[amirKey].dismissalLabel).toBeNull();
    expect(snap.striker?.name).toBe("Amir");
    expect(snap.nonStriker?.name).toBe("B");
    expect(snap.bowler?.name).toBe("X");

    const crease = deriveCreaseDisplay(
      state,
      state.strikerKey,
      wicketReplacementSlotFromEngineState(state),
      deriveScoringPhase(state, ctx) === "need_batter",
    );
    const strikerRow = liveCreaseBatterForEnd(
      state,
      "striker",
      crease,
      null,
      creaseFromKey,
      pendingRow,
    );
    expect(strikerRow?.name).toBe("Amir");
    expect(strikerRow?.isOut).toBe(false);
    expect(strikerRow?.pending).toBe(false);
  });
});
