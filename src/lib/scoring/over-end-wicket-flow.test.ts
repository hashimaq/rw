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
import {
  soleActiveBatterAtCrease,
  wicketReplacementSlotFromDelivery,
} from "@/lib/scoring/crease-sync";
import {
  activeBattersAtCrease,
  deriveScoringPhase,
  scoringUiSnapshotFromEngineState,
} from "@/lib/scoring/scoring-phase";
import { participantKey } from "@/lib/scoring-engine/utils";

const A = "11111111-1111-4111-8111-111111111111";
const B = "22222222-2222-4222-8222-222222222222";
const C = "33333333-3333-4333-8333-333333333333";
const D = "44444444-4444-4444-8444-444444444444";
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

function bowlLegalDots(state: ReturnType<typeof createEmptyInningsState>, n: number) {
  let s = state;
  for (let i = 0; i < n; i += 1) {
    s = applyDeliveryToState(
      s,
      buildNormalRunDelivery(s, P, `dot-${i}`, 0),
    );
  }
  return s;
}

describe("wicket + end of over phase transitions", () => {
  it("wicket on ball 1 stays need_batter only", () => {
    let s = createEmptyInningsState(20);
    s = applyDeliveryToState(
      s,
      buildWicketDelivery(s, P, "w1", {
        wicketType: "bowled",
        dismissedPlayerId: A,
        dismissedPlayerName: "Striker",
      }),
    );
    expect(activeBattersAtCrease(s)).toBe(1);
    expect(deriveScoringPhase(s, ctx)).toBe("need_batter");
  });

  it("wicket on ball 5 is need_batter not need_bowler", () => {
    let s = bowlLegalDots(createEmptyInningsState(20), 4);
    s = applyDeliveryToState(
      s,
      buildWicketDelivery(s, P, "w5", {
        wicketType: "caught",
        dismissedPlayerId: A,
        dismissedPlayerName: "Striker",
        fielderPlayerId: D,
        fielderName: "Fielder",
      }),
    );
    expect(s.legalBalls).toBe(5);
    expect(deriveScoringPhase(s, ctx)).toBe("need_batter");
  });

  it("wicket on final legal ball requires batter before bowler", () => {
    let s = bowlLegalDots(createEmptyInningsState(20), 5);
    s = applyDeliveryToState(
      s,
      buildWicketDelivery(s, P, "w6", {
        wicketType: "bowled",
        dismissedPlayerId: A,
        dismissedPlayerName: "Striker",
      }),
    );
    expect(s.legalBalls).toBe(6);
    expect(deriveScoringPhase(s, ctx)).toBe("need_batter");

    const replacement: ActiveParticipants = {
      ...P,
      strikerPlayerId: E,
      strikerName: "Replacement",
    };
    s = applyDeliveryToState(
      s,
      buildCreaseCorrectionDelivery(s, replacement, "crease-new-batter"),
    );
    expect(activeBattersAtCrease(s)).toBe(2);
    expect(deriveScoringPhase(s, ctx)).toBe("need_bowler");

    const nextBowler: ActiveParticipants = {
      ...replacement,
      bowlerPlayerId: D,
      bowlerName: "NextBowler",
    };
    s = applyDeliveryToState(
      s,
      buildCreaseCorrectionDelivery(s, nextBowler, "bowler-pick"),
    );
    expect(deriveScoringPhase(s, ctx)).toBe("scoring");
    expect(s.currentBowlerKey).toBe(participantKey(D, "NextBowler"));

    s = applyDeliveryToState(
      s,
      buildNormalRunDelivery(s, nextBowler, "ball7", 1),
    );
    expect(s.deliveries[s.deliveries.length - 1]?.bowlerName).toBe("NextBowler");
  });

  it("normal 6th ball without wicket goes straight to need_bowler", () => {
    let s = bowlLegalDots(createEmptyInningsState(20), 6);
    expect(deriveScoringPhase(s, ctx)).toBe("need_bowler");
  });

  it("UI snapshot exposes replacement slot only in need_batter", () => {
    let s = bowlLegalDots(createEmptyInningsState(20), 5);
    s = applyDeliveryToState(
      s,
      buildWicketDelivery(s, P, "w6b", {
        wicketType: "bowled",
        dismissedPlayerId: A,
        dismissedPlayerName: "Striker",
      }),
    );
    const snap = scoringUiSnapshotFromEngineState(s, ctx);
    expect(snap.phase).toBe("need_batter");
    expect(snap.wicketReplacementSlot).not.toBeNull();
  });

  it("after last-ball wicket + over swap, survivor is found for replacement UI", () => {
    let s = bowlLegalDots(createEmptyInningsState(20), 5);
    s = applyDeliveryToState(
      s,
      buildWicketDelivery(s, P, "w6c", {
        wicketType: "bowled",
        dismissedPlayerId: A,
        dismissedPlayerName: "Striker",
      }),
    );
    expect(soleActiveBatterAtCrease(s)?.name).toBe("NonStriker");
    const last = s.deliveries[s.deliveries.length - 1]!;
    const slot = wicketReplacementSlotFromDelivery(
      s,
      last.dismissedPlayerId,
      last.dismissedPlayerName,
    );
    expect(slot).not.toBeNull();
    const survivor = soleActiveBatterAtCrease(s)!;
    const replacement: ActiveParticipants = {
      ...P,
      strikerPlayerId: slot === "striker" ? E : survivor.playerId,
      strikerName: slot === "striker" ? "Replacement" : survivor.name,
      nonStrikerPlayerId: slot === "non_striker" ? E : survivor.playerId,
      nonStrikerName: slot === "non_striker" ? "Replacement" : survivor.name,
    };
    s = applyDeliveryToState(
      s,
      buildCreaseCorrectionDelivery(s, replacement, "crease-after-survivor"),
    );
    expect(activeBattersAtCrease(s)).toBe(2);
    expect(deriveScoringPhase(s, ctx)).toBe("need_bowler");
  });
});
