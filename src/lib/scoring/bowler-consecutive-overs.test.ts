import { describe, expect, it } from "vitest";
import {
  applyDeliveryToState,
  createEmptyInningsState,
} from "@/lib/scoring-engine/build-state";
import {
  buildNormalRunDelivery,
  type ActiveParticipants,
} from "@/lib/scoring-engine/delivery-builders";
import {
  isStartOfNewOver,
  validateConsecutiveOverBowler,
} from "@/lib/scoring/bowler-consecutive-overs";

const P: ActiveParticipants = {
  strikerPlayerId: "a",
  strikerName: "A",
  nonStrikerPlayerId: "b",
  nonStrikerName: "B",
  bowlerPlayerId: "bowler-a",
  bowlerName: "Bowler A",
};

describe("consecutive over bowler rule", () => {
  it("flags same bowler at start of new over", () => {
    let s = createEmptyInningsState(20);
    for (let i = 0; i < 6; i++) {
      s = applyDeliveryToState(
        s,
        buildNormalRunDelivery(s, P, `d${i}`, 1),
      );
    }
    expect(isStartOfNewOver(s)).toBe(true);
    expect(
      validateConsecutiveOverBowler(s, P.bowlerPlayerId, P.bowlerName),
    ).toMatch(/consecutive overs/i);
  });

  it("allows different bowler at start of new over", () => {
    let s = createEmptyInningsState(20);
    for (let i = 0; i < 6; i++) {
      s = applyDeliveryToState(
        s,
        buildNormalRunDelivery(s, P, `d${i}`, 1),
      );
    }
    expect(
      validateConsecutiveOverBowler(s, "bowler-b", "Bowler B"),
    ).toBeNull();
  });

  it("allows same bowler mid-over after undo restores incomplete over", () => {
    let s = createEmptyInningsState(20);
    for (let i = 0; i < 6; i++) {
      s = applyDeliveryToState(
        s,
        buildNormalRunDelivery(s, P, `d${i}`, 1),
      );
    }
    s = applyDeliveryToState(
      s,
      buildNormalRunDelivery(s, P, "d6", 1),
    );
    expect(s.legalBalls).toBe(7);
    expect(isStartOfNewOver(s)).toBe(false);
    expect(
      validateConsecutiveOverBowler(s, P.bowlerPlayerId, P.bowlerName),
    ).toBeNull();
  });
});
