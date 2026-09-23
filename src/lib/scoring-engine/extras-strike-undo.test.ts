import { describe, expect, it } from "vitest";
import {
  applyDeliveryToState,
  createEmptyInningsState,
  undoLastDelivery,
} from "@/lib/scoring-engine/build-state";
import {
  buildNoBallDelivery,
  buildNormalRunDelivery,
  buildWideDelivery,
  type ActiveParticipants,
} from "@/lib/scoring-engine/delivery-builders";
import { participantKey } from "@/lib/scoring-engine/utils";
import { scoringUiSnapshotFromEngineState } from "@/lib/scoring/scoring-phase";

const A = "11111111-1111-4111-8111-111111111111";
const B = "22222222-2222-4222-8222-222222222222";
const C = "33333333-3333-4333-8333-333333333333";

const P: ActiveParticipants = {
  strikerPlayerId: A,
  strikerName: "Striker",
  nonStrikerPlayerId: B,
  nonStrikerName: "NonStriker",
  bowlerPlayerId: C,
  bowlerName: "Bowler",
};

const aKey = participantKey(A, "Striker");
const bKey = participantKey(B, "NonStriker");
const ctx = { inningsNumber: 1 as const };

function uuid(n: number) {
  return `${String(n).padStart(8, "0")}-0000-4000-8000-000000000001`;
}

describe("wide scoring and strike", () => {
  it("wide credits 0 to batter and all runs as wides", () => {
    let s = createEmptyInningsState(20);
    s = applyDeliveryToState(s, buildWideDelivery(s, P, uuid(1), 2));
    expect(s.totalRuns).toBe(3);
    expect(s.batters[aKey].runs).toBe(0);
    expect(s.extrasBreakdown.wides).toBe(3);
    expect(s.legalBalls).toBe(0);
  });

  it.each([
    [0, aKey],
    [1, bKey],
    [2, aKey],
    [3, bKey],
    [4, aKey],
    [5, bKey],
    [6, aKey],
  ] as const)("wide additional %i rotates strike when additional odd", (add, expectedStriker) => {
    let s = createEmptyInningsState(20);
    s = applyDeliveryToState(s, buildNormalRunDelivery(s, P, uuid(0), 0));
    expect(s.strikerKey).toBe(aKey);
    s = applyDeliveryToState(s, buildWideDelivery(s, P, uuid(1), add));
    expect(s.strikerKey).toBe(expectedStriker);
  });
});

describe("no-ball scoring and strike", () => {
  it("no-ball + bat 6 splits batter and extras", () => {
    let s = createEmptyInningsState(20);
    s = applyDeliveryToState(
      s,
      buildNoBallDelivery(s, P, uuid(1), { kind: "bat", additionalRuns: 6 }),
    );
    expect(s.totalRuns).toBe(7);
    expect(s.batters[aKey].runs).toBe(6);
    expect(s.extrasBreakdown.noBalls).toBe(1);
    expect(s.extrasBreakdown.byes).toBe(0);
    expect(s.legalBalls).toBe(0);
  });

  it("no-ball + 4 byes credits 0 to batter", () => {
    let s = createEmptyInningsState(20);
    s = applyDeliveryToState(
      s,
      buildNoBallDelivery(s, P, uuid(1), { kind: "bye", additionalRuns: 4 }),
    );
    expect(s.totalRuns).toBe(5);
    expect(s.batters[aKey].runs).toBe(0);
    expect(s.extrasBreakdown.noBalls).toBe(1);
    expect(s.extrasBreakdown.byes).toBe(4);
  });

  it("no-ball + leg-byes credits 0 to batter", () => {
    let s = createEmptyInningsState(20);
    s = applyDeliveryToState(
      s,
      buildNoBallDelivery(s, P, uuid(1), { kind: "leg_bye", additionalRuns: 2 }),
    );
    expect(s.extrasBreakdown.legByes).toBe(2);
    expect(s.batters[aKey].runs).toBe(0);
  });

  it("no-ball + bat 2 keeps strike (additional 2)", () => {
    let s = createEmptyInningsState(20);
    s = applyDeliveryToState(s, buildNormalRunDelivery(s, P, uuid(0), 0));
    s = applyDeliveryToState(
      s,
      buildNoBallDelivery(s, P, uuid(1), { kind: "bat", additionalRuns: 2 }),
    );
    expect(s.totalRuns).toBe(3);
    expect(s.strikerKey).toBe(aKey);
  });

  it("no-ball + bat 1 rotates strike (additional 1)", () => {
    let s = createEmptyInningsState(20);
    s = applyDeliveryToState(s, buildNormalRunDelivery(s, P, uuid(0), 0));
    s = applyDeliveryToState(
      s,
      buildNoBallDelivery(s, P, uuid(1), { kind: "bat", additionalRuns: 1 }),
    );
    expect(s.totalRuns).toBe(2);
    expect(s.strikerKey).toBe(bKey);
  });

  it("no-ball only keeps strike (additional 0)", () => {
    let s = createEmptyInningsState(20);
    s = applyDeliveryToState(s, buildNormalRunDelivery(s, P, uuid(0), 0));
    s = applyDeliveryToState(
      s,
      buildNoBallDelivery(s, P, uuid(1), { kind: "none", additionalRuns: 0 }),
    );
    expect(s.totalRuns).toBe(1);
    expect(s.strikerKey).toBe(aKey);
  });
});

describe("undo on extras", () => {
  it("undo wide restores strike and totals", () => {
    let s = createEmptyInningsState(20);
    s = applyDeliveryToState(s, buildNormalRunDelivery(s, P, uuid(1), 0));
    const before = s.strikerKey;
    s = applyDeliveryToState(s, buildWideDelivery(s, P, uuid(2), 0));
    const undone = undoLastDelivery(s)!;
    expect(undone.totalRuns).toBe(0);
    expect(undone.strikerKey).toBe(before);
    expect(scoringUiSnapshotFromEngineState(undone, ctx).phase).toBe("scoring");
  });

  it("undo no-ball + bye restores extras breakdown", () => {
    let s = createEmptyInningsState(20);
    s = applyDeliveryToState(
      s,
      buildNoBallDelivery(s, P, uuid(1), { kind: "bye", additionalRuns: 3 }),
    );
    const undone = undoLastDelivery(s)!;
    expect(undone.totalRuns).toBe(0);
    expect(undone.extrasBreakdown.byes).toBe(0);
    expect(undone.extrasBreakdown.noBalls).toBe(0);
  });

  function participantsFromEngine(
    s: ReturnType<typeof createEmptyInningsState>,
  ): ActiveParticipants {
    const sk = s.strikerKey!;
    const nsk = s.nonStrikerKey!;
    const st = s.batters[sk];
    const ns = s.batters[nsk];
    return {
      strikerPlayerId: st.playerId,
      strikerName: st.name,
      nonStrikerPlayerId: ns.playerId,
      nonStrikerName: ns.name,
      bowlerPlayerId: C,
      bowlerName: "Bowler",
    };
  }

  it.each([
    ["none", 0],
    ["bat", 2],
    ["bat", 4],
    ["bat", 6],
    ["bye", 0],
    ["bye", 2],
    ["bye", 4],
    ["leg_bye", 0],
    ["leg_bye", 2],
    ["leg_bye", 4],
  ] as const)("undo no-ball + %s %i restores striker (even additional)", (kind, add) => {
    let s = createEmptyInningsState(20);
    s = applyDeliveryToState(s, buildNormalRunDelivery(s, P, uuid(0), 0));
    s = applyDeliveryToState(s, buildNormalRunDelivery(s, P, uuid(1), 1));
    const before = s.strikerKey;
    const Pe = participantsFromEngine(s);
    const d = buildNoBallDelivery(s, Pe, uuid(2), { kind, additionalRuns: add });
    expect(d.totalRuns).toBe(1 + add);
    s = applyDeliveryToState(s, d);
    expect(s.strikerKey).toBe(before);
    const undone = undoLastDelivery(s)!;
    expect(undone.strikerKey).toBe(before);
  });

  it.each([
    ["bat", 1],
    ["bat", 3],
    ["bye", 1],
    ["bye", 3],
    ["leg_bye", 1],
    ["leg_bye", 3],
  ] as const)("undo no-ball + %s %i restores striker (odd additional)", (kind, add) => {
    let s = createEmptyInningsState(20);
    s = applyDeliveryToState(s, buildNormalRunDelivery(s, P, uuid(0), 0));
    const before = s.strikerKey;
    const Pe = participantsFromEngine(s);
    const d = buildNoBallDelivery(s, Pe, uuid(2), { kind, additionalRuns: add });
    s = applyDeliveryToState(s, d);
    expect(s.strikerKey).not.toBe(before);
    const undone = undoLastDelivery(s)!;
    expect(undone.strikerKey).toBe(before);
  });
});
