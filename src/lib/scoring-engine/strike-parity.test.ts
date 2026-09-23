import { describe, expect, it } from "vitest";
import {
  applyDeliveryToState,
  buildInningsStateFromDeliveries,
  createEmptyInningsState,
  undoLastDelivery,
} from "@/lib/scoring-engine/build-state";
import {
  buildByeDelivery,
  buildLegByeDelivery,
  buildNoBallDelivery,
  buildNormalRunDelivery,
  buildWideDelivery,
  type ActiveParticipants,
} from "@/lib/scoring-engine/delivery-builders";
import { shouldSwapStrikeForDelivery } from "@/lib/scoring-engine/strike-change";
import { participantKey } from "@/lib/scoring-engine/utils";

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

function uuid(n: number) {
  return `${String(n).padStart(8, "0")}-0000-4000-8000-000000000001`;
}

function withOpeners() {
  let s = createEmptyInningsState(20);
  s = applyDeliveryToState(s, buildNormalRunDelivery(s, P, uuid(0), 0));
  expect(s.strikerKey).toBe(aKey);
  return s;
}

function strikerAfterNormal(s: ReturnType<typeof createEmptyInningsState>, runs: number) {
  return applyDeliveryToState(
    s,
    buildNormalRunDelivery(s, P, crypto.randomUUID(), runs),
  ).strikerKey;
}

describe("strike parity (odd total = swap)", () => {
  it.each([
    [0, false],
    [1, true],
    [2, false],
    [3, true],
    [4, false],
    [5, true],
    [6, false],
  ] as const)("normal %i runs", (runs, swaps) => {
    const s = withOpeners();
    const before = s.strikerKey;
    const after = strikerAfterNormal(s, runs);
    expect(after === before).toBe(!swaps);
  });

  it.each([
    [0, true],
    [1, false],
    [2, true],
    [3, false],
    [4, true],
    [5, false],
    [6, true],
  ] as const)("wide additional %i (penalty excluded from strike)", (add, strikerIsA) => {
    let s = withOpeners();
    s = applyDeliveryToState(s, buildWideDelivery(s, P, uuid(1), add));
    expect(s.strikerKey === aKey).toBe(strikerIsA);
    const d = s.deliveries[s.deliveries.length - 1];
    expect(shouldSwapStrikeForDelivery(d)).toBe(add % 2 === 1);
  });

  it.each([
    [{ kind: "none" as const, add: 0 }, true],
    [{ kind: "bat" as const, add: 1 }, false],
    [{ kind: "bat" as const, add: 2 }, true],
    [{ kind: "bat" as const, add: 3 }, false],
    [{ kind: "bat" as const, add: 4 }, true],
    [{ kind: "bat" as const, add: 5 }, false],
    [{ kind: "bat" as const, add: 6 }, true],
    [{ kind: "bye" as const, add: 0 }, true],
    [{ kind: "bye" as const, add: 1 }, false],
    [{ kind: "bye" as const, add: 2 }, true],
    [{ kind: "bye" as const, add: 3 }, false],
    [{ kind: "bye" as const, add: 4 }, true],
    [{ kind: "leg_bye" as const, add: 0 }, true],
    [{ kind: "leg_bye" as const, add: 1 }, false],
    [{ kind: "leg_bye" as const, add: 2 }, true],
    [{ kind: "leg_bye" as const, add: 3 }, false],
    [{ kind: "leg_bye" as const, add: 4 }, true],
  ])("no-ball %#", (opts, strikerIsA) => {
    let s = withOpeners();
    const d = buildNoBallDelivery(s, P, uuid(2), {
      kind: opts.kind,
      additionalRuns: opts.add,
    });
    expect(d.totalRuns).toBe(1 + opts.add);
    s = applyDeliveryToState(s, d);
    expect(s.strikerKey === aKey).toBe(strikerIsA);
    expect(shouldSwapStrikeForDelivery(d)).toBe(opts.add % 2 === 1);
  });
});

describe("strike undo and rebuild", () => {
  it.each([1, 2, 3, 4])("undo normal %i restores striker", (runs) => {
    let s = withOpeners();
    const before = s.strikerKey;
    s = applyDeliveryToState(s, buildNormalRunDelivery(s, P, uuid(1), runs));
    const undone = undoLastDelivery(s)!;
    expect(undone.strikerKey).toBe(before);
  });

  it.each([0, 1, 2, 3, 4, 5, 6])("undo wide additional %i", (add) => {
    let s = withOpeners();
    const before = s.strikerKey;
    s = applyDeliveryToState(s, buildWideDelivery(s, P, uuid(1), add));
    expect(undoLastDelivery(s)!.strikerKey).toBe(before);
  });

  it("rebuild from deliveries matches incremental state", () => {
    let s = withOpeners();
    const deliveries = [...s.deliveries];
    s = applyDeliveryToState(s, buildNormalRunDelivery(s, P, uuid(1), 3));
    deliveries.push(s.deliveries[s.deliveries.length - 1]);
    s = applyDeliveryToState(
      s,
      buildNoBallDelivery(s, P, uuid(2), { kind: "bye", additionalRuns: 2 }),
    );
    deliveries.push(s.deliveries[s.deliveries.length - 1]);
    const rebuilt = buildInningsStateFromDeliveries(deliveries, 20);
    expect(rebuilt.strikerKey).toBe(s.strikerKey);
    expect(rebuilt.nonStrikerKey).toBe(s.nonStrikerKey);
    expect(rebuilt.totalRuns).toBe(s.totalRuns);
  });
});

describe("end of over with delivery strike", () => {
  it("6 legal balls with dot then rebuild preserves striker", () => {
    let s = withOpeners();
    for (let i = 0; i < 4; i += 1) {
      s = applyDeliveryToState(
        s,
        buildNormalRunDelivery(s, P, uuid(10 + i), 0),
      );
    }
    const beforeSixth = s.strikerKey;
    s = applyDeliveryToState(s, buildNormalRunDelivery(s, P, uuid(20), 0));
    expect(s.legalBalls).toBe(6);
    const rebuilt = buildInningsStateFromDeliveries(s.deliveries, 20);
    expect(rebuilt.strikerKey).toBe(s.strikerKey);
    expect(rebuilt.strikerKey).not.toBe(beforeSixth);
  });

  it("6th ball single: delivery swap then over swap (rebuild consistent)", () => {
    let s = withOpeners();
    for (let i = 0; i < 4; i += 1) {
      s = applyDeliveryToState(
        s,
        buildNormalRunDelivery(s, P, uuid(10 + i), 0),
      );
    }
    s = applyDeliveryToState(s, buildNormalRunDelivery(s, P, uuid(20), 1));
    const rebuilt = buildInningsStateFromDeliveries(s.deliveries, 20);
    expect(rebuilt.strikerKey).toBe(s.strikerKey);
  });

  it("wide Wd+0 through Wd+6 undo restores opener crease", () => {
    let s = withOpeners();
    expect(s.strikerKey).toBe(aKey);
    expect(s.nonStrikerKey).toBe(bKey);
    for (const add of [0, 1, 2, 3, 4, 5, 6] as const) {
      const before = structuredClone(s);
      s = applyDeliveryToState(s, buildWideDelivery(s, P, uuid(100 + add), add));
      s = undoLastDelivery(s)!;
      expect(s.strikerKey).toBe(before.strikerKey);
      expect(s.nonStrikerKey).toBe(before.nonStrikerKey);
    }
  });

  it("normal → wide → normal strike sequence", () => {
    let s = withOpeners();
    s = applyDeliveryToState(s, buildNormalRunDelivery(s, P, uuid(1), 0));
    expect(s.strikerKey).toBe(aKey);
    s = applyDeliveryToState(s, buildWideDelivery(s, P, uuid(2), 1));
    expect(s.strikerKey).toBe(bKey);
    const bOnStrike = {
      ...P,
      strikerPlayerId: B,
      strikerName: "NonStriker",
      nonStrikerPlayerId: A,
      nonStrikerName: "Striker",
    };
    s = applyDeliveryToState(s, buildNormalRunDelivery(s, bOnStrike, uuid(3), 0));
    expect(s.strikerKey).toBe(bKey);
    s = applyDeliveryToState(s, buildWideDelivery(s, bOnStrike, uuid(4), 2));
    expect(s.strikerKey).toBe(bKey);
    s = applyDeliveryToState(s, buildNormalRunDelivery(s, bOnStrike, uuid(5), 1));
    expect(s.strikerKey).toBe(aKey);
  });

  it("NB bat then wide uses additional-wide parity", () => {
    let s = withOpeners();
    s = applyDeliveryToState(
      s,
      buildNoBallDelivery(s, P, uuid(1), { kind: "bat", additionalRuns: 1 }),
    );
    expect(s.strikerKey).toBe(bKey);
    const onCrease = {
      ...P,
      strikerPlayerId: B,
      strikerName: "NonStriker",
      nonStrikerPlayerId: A,
      nonStrikerName: "Striker",
    };
    s = applyDeliveryToState(s, buildWideDelivery(s, onCrease, uuid(2), 1));
    expect(s.strikerKey).toBe(aKey);
  });

  it("bye and leg-bye use total runs for strike", () => {
    let s = withOpeners();
    s = applyDeliveryToState(s, buildByeDelivery(s, P, uuid(1), 2));
    expect(s.strikerKey).toBe(aKey);
    s = applyDeliveryToState(s, buildLegByeDelivery(s, P, uuid(2), 1));
    expect(s.strikerKey).toBe(bKey);
  });
});
