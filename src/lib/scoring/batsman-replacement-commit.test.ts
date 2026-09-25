import { describe, expect, it } from "vitest";
import {
  applyDeliveryToState,
  createEmptyInningsState,
} from "@/lib/scoring-engine/build-state";
import {
  buildCreaseCorrectionDelivery,
  buildNormalRunDelivery,
  buildWicketDelivery,
  type ActiveParticipants,
} from "@/lib/scoring-engine/delivery-builders";
import { allowDeliveryAgainstConsecutiveOverRule } from "@/lib/scoring/delivery-bowler-validation";
import { commitInningsDeliveryUpdate } from "@/lib/scoring/commit-innings-delivery";
import {
  activeBattersAtCrease,
  deriveScoringPhase,
  wicketReplacementSlotFromEngineState,
} from "@/lib/scoring/scoring-phase";
import { soleActiveBatterAtCrease } from "@/lib/scoring/crease-sync";

const A = "11111111-1111-4111-8111-111111111111";
const B = "22222222-2222-4222-8222-222222222222";
const C = "33333333-3333-4333-8333-333333333333";
const E = "55555555-5555-4555-8555-555555555555";

const P: ActiveParticipants = {
  strikerPlayerId: A,
  strikerName: "Striker",
  nonStrikerPlayerId: B,
  nonStrikerName: "NonStriker",
  bowlerPlayerId: C,
  bowlerName: "BowlerX",
};

const ctx = { inningsNumber: 1 as const };

describe("batsman replacement commit (global)", () => {
  it("allows crease correction at new over even with same bowler in payload", () => {
    let s = createEmptyInningsState(20);
    for (let i = 0; i < 5; i += 1) {
      s = applyDeliveryToState(
        s,
        buildNormalRunDelivery(s, P, `d-${i}`, 0),
      );
    }
    s = applyDeliveryToState(
      s,
      buildWicketDelivery(s, P, "w6", {
        wicketType: "bowled",
        dismissedPlayerId: A,
        dismissedPlayerName: "Striker",
      }),
    );
    expect(deriveScoringPhase(s, ctx)).toBe("need_batter");

    const survivor = soleActiveBatterAtCrease(s)!;
    const slot = wicketReplacementSlotFromEngineState(s)!;
    const participants: ActiveParticipants = {
      ...P,
      strikerPlayerId: slot === "striker" ? E : survivor.playerId,
      strikerName: slot === "striker" ? "Replacement" : survivor.name,
      nonStrikerPlayerId: slot === "non_striker" ? E : survivor.playerId,
      nonStrikerName: slot === "non_striker" ? "Replacement" : survivor.name,
    };
    const correction = buildCreaseCorrectionDelivery(
      s,
      participants,
      "crease-1",
    );
    expect(
      allowDeliveryAgainstConsecutiveOverRule(s, correction),
    ).toBe(true);

    const committed = commitInningsDeliveryUpdate(
      s,
      s,
      "crease-1",
      () => correction,
      allowDeliveryAgainstConsecutiveOverRule,
    );
    expect(committed.delivery).not.toBeNull();
    expect(activeBattersAtCrease(committed.next)).toBe(2);
    expect(deriveScoringPhase(committed.next, ctx)).toBe("need_bowler");
  });

  it("still blocks real ball with same bowler on new over", () => {
    let s = createEmptyInningsState(20);
    for (let i = 0; i < 6; i += 1) {
      s = applyDeliveryToState(
        s,
        buildNormalRunDelivery(s, P, `d-${i}`, 0),
      );
    }
    const nextBall = buildNormalRunDelivery(s, P, "d-7", 1);
    expect(allowDeliveryAgainstConsecutiveOverRule(s, nextBall)).toBe(false);
  });
});
