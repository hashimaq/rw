import { describe, expect, it } from "vitest";
import {
  applyDeliveryToState,
  buildInningsStateFromDeliveries,
  createEmptyInningsState,
  liveSummary,
} from "@/lib/scoring-engine/build-state";
import {
  buildCreaseCorrectionDelivery,
  buildNormalRunDelivery,
  type ActiveParticipants,
} from "@/lib/scoring-engine/delivery-builders";
import { deriveScoringPhase } from "@/lib/scoring/scoring-phase";
import { participantKey } from "@/lib/scoring-engine/utils";

const A = "11111111-1111-4111-8111-111111111111";
const B = "22222222-2222-4222-8222-222222222222";
const C = "33333333-3333-4333-8333-333333333333";
const D = "44444444-4444-4444-8444-444444444444";

const P: ActiveParticipants = {
  strikerPlayerId: A,
  strikerName: "A",
  nonStrikerPlayerId: B,
  nonStrikerName: "B",
  bowlerPlayerId: C,
  bowlerName: "X",
};

const ctx = { inningsNumber: 1 as const };

describe("over end → need bowler", () => {
  it("enters need_bowler immediately after 6th legal ball", () => {
    let s = createEmptyInningsState(20);
    for (let i = 0; i < 6; i += 1) {
      s = applyDeliveryToState(
        s,
        buildNormalRunDelivery(s, P, `b${i}`, 0),
      );
    }
    expect(s.legalBalls).toBe(6);
    expect(deriveScoringPhase(s, ctx)).toBe("need_bowler");
  });

  it("after over-end bowler selection, phase is scoring and live summary shows Ahmed", () => {
    let s = createEmptyInningsState(20);
    for (let i = 0; i < 6; i += 1) {
      s = applyDeliveryToState(
        s,
        buildNormalRunDelivery(s, P, `b${i}`, 0),
      );
    }
    expect(deriveScoringPhase(s, ctx)).toBe("need_bowler");

    const ahmed: ActiveParticipants = {
      ...P,
      bowlerPlayerId: D,
      bowlerName: "Ahmed",
    };
    s = applyDeliveryToState(
      s,
      buildCreaseCorrectionDelivery(s, ahmed, "bowler-pick"),
    );

    expect(deriveScoringPhase(s, ctx)).toBe("scoring");
    expect(s.currentBowlerKey).toBe(participantKey(D, "Ahmed"));
    expect(liveSummary(s).bowler?.name).toBe("Ahmed");

    s = applyDeliveryToState(
      s,
      buildNormalRunDelivery(s, ahmed, "b6", 1),
    );
    expect(s.deliveries[s.deliveries.length - 1]?.bowlerName).toBe("Ahmed");
    expect(buildInningsStateFromDeliveries(s.deliveries, 20).bowlers[
      participantKey(D, "Ahmed")
    ]?.legalBalls).toBe(1);
  });
});
