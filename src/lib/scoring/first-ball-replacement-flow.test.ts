import { describe, expect, it } from "vitest";
import {
  applyDeliveryToState,
  buildInningsStateFromDeliveries,
  createEmptyInningsState,
} from "@/lib/scoring-engine/build-state";
import {
  buildCreaseCorrectionDelivery,
  buildNormalRunDelivery,
  buildWicketDelivery,
  type ActiveParticipants,
} from "@/lib/scoring-engine/delivery-builders";
import { participantKey } from "@/lib/scoring-engine/utils";
import { syncCreaseRefsFromEngineState } from "@/lib/scoring/crease-sync";
import {
  deriveScoringPhase,
  scoringUiSnapshotFromEngineState,
  wicketReplacementSlotFromEngineState,
} from "@/lib/scoring/scoring-phase";

const A = "11111111-1111-4111-8111-111111111111";
const B = "22222222-2222-4222-8222-222222222222";
const C = "33333333-3333-4333-8333-333333333333";
const X = "44444444-4444-4444-8444-444444444444";

const P: ActiveParticipants = {
  strikerPlayerId: A,
  strikerName: "A",
  nonStrikerPlayerId: B,
  nonStrikerName: "B",
  bowlerPlayerId: X,
  bowlerName: "X",
};

const aKey = participantKey(A, "A");
const bKey = participantKey(B, "B");
const cKey = participantKey(C, "C");
const ctx = { inningsNumber: 1 as const };

/** Simulates hook striker null after wicket while non-striker survives. */
function applyReplacementAfterFirstBallWicket() {
  let s = createEmptyInningsState(20);
  s = applyDeliveryToState(
    s,
    buildWicketDelivery(s, P, "w1", {
      wicketType: "bowled",
      dismissedPlayerId: A,
      dismissedPlayerName: "A",
    }),
  );
  expect(deriveScoringPhase(s, ctx)).toBe("need_batter");
  expect(wicketReplacementSlotFromEngineState(s)).toBe("striker");

  const snap = scoringUiSnapshotFromEngineState(s, ctx);
  expect(snap.striker).toBeNull();
  expect(snap.nonStriker?.name).toBe("B");

  const survivor = syncCreaseRefsFromEngineState(s).nonStriker!;
  s = applyDeliveryToState(
    s,
    buildCreaseCorrectionDelivery(
      s,
      {
        strikerPlayerId: C,
        strikerName: "C",
        nonStrikerPlayerId: survivor.playerId,
        nonStrikerName: survivor.name,
        bowlerPlayerId: X,
        bowlerName: "X",
      },
      "replace",
    ),
  );

  expect(s.strikerKey).toBe(cKey);
  expect(s.nonStrikerKey).toBe(bKey);
  expect(deriveScoringPhase(s, ctx)).toBe("scoring");

  s = applyDeliveryToState(
    s,
    buildNormalRunDelivery(
      s,
      {
        strikerPlayerId: C,
        strikerName: "C",
        nonStrikerPlayerId: B,
        nonStrikerName: "B",
        bowlerPlayerId: X,
        bowlerName: "X",
      },
      "dot",
      0,
    ),
  );
  expect(s.batters[cKey].balls).toBe(1);
  expect(s.strikerKey).toBe(cKey);

  const rebuilt = buildInningsStateFromDeliveries(s.deliveries, 20);
  expect(rebuilt.strikerKey).toBe(cKey);
  expect(rebuilt.batters[cKey].balls).toBe(1);
  return s;
}

describe("first-ball replacement flow", () => {
  it("bowled → select C → score dot → rebuild", () => {
    applyReplacementAfterFirstBallWicket();
  });
});
