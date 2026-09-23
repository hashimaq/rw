import { describe, expect, it } from "vitest";
import {
  applyDeliveryToState,
  buildInningsStateFromDeliveries,
  createEmptyInningsState,
  undoLastDelivery,
} from "@/lib/scoring-engine/build-state";
import {
  buildNoBallDelivery,
  buildNormalRunDelivery,
  buildWideDelivery,
  type ActiveParticipants,
} from "@/lib/scoring-engine/delivery-builders";
import { noBallAdditionalRuns } from "@/lib/scoring-engine/strike-change";
import { participantKey } from "@/lib/scoring-engine/utils";
import { mergeDeliveries } from "@/lib/scoring/merge-deliveries";

const A = "11111111-1111-4111-8111-111111111111";
const B = "22222222-2222-4222-8222-222222222222";
const C = "33333333-3333-4333-8333-333333333333";

const P: ActiveParticipants = {
  strikerPlayerId: A,
  strikerName: "A",
  nonStrikerPlayerId: B,
  nonStrikerName: "B",
  bowlerPlayerId: C,
  bowlerName: "X",
};

const aKey = participantKey(A, "A");
const bKey = participantKey(B, "B");

function withOpeners() {
  let s = createEmptyInningsState(20);
  s = applyDeliveryToState(s, buildNormalRunDelivery(s, P, "d0", 0));
  return s;
}

describe("no-ball score invariants", () => {
  it.each([
    ["none", 0, 1, 0, 1, 0],
    ["bat", 1, 2, 1, 1, 0],
    ["bat", 4, 5, 4, 1, 0],
    ["bye", 2, 3, 0, 3, 2],
    ["leg_bye", 3, 4, 0, 4, 3],
  ] as const)(
    "kind %s + %i → total %i",
    (kind, add, total, batterRuns, extrasRuns, extraByesOrLb) => {
      const s = withOpeners();
      const d = buildNoBallDelivery(s, P, "nb", {
        kind,
        additionalRuns: add,
      });
      expect(d.totalRuns).toBe(total);
      expect(d.batterRuns).toBe(batterRuns);
      expect(d.extrasRuns).toBe(extrasRuns);
      expect(noBallAdditionalRuns(d)).toBe(add);
      const next = applyDeliveryToState(s, d);
      expect(next.totalRuns).toBe(total);
      expect(next.extrasBreakdown.noBalls).toBe(1);
      if (kind === "bye") expect(next.extrasBreakdown.byes).toBe(extraByesOrLb);
      if (kind === "leg_bye") {
        expect(next.extrasBreakdown.legByes).toBe(extraByesOrLb);
      }
    },
  );
});

describe("no-ball strike from additional runs only", () => {
  it.each([
    [0, aKey],
    [1, bKey],
    [2, aKey],
    [3, bKey],
    [4, aKey],
    [5, bKey],
    [6, aKey],
  ] as const)("bat additional %i", (add, expectedStriker) => {
    const s = withOpeners();
    const next = applyDeliveryToState(
      s,
      buildNoBallDelivery(s, P, `nb-${add}`, { kind: "bat", additionalRuns: add }),
    );
    expect(next.strikerKey).toBe(expectedStriker);
  });
});

describe("no-ball undo from base 37", () => {
  function at37() {
    let s = withOpeners();
    s = applyDeliveryToState(s, buildNormalRunDelivery(s, P, "37", 37));
    return s;
  }

  it.each([0, 1, 2, 3, 4, 5, 6] as const)("NB + %i then undo", (add) => {
    let s = at37();
    const beforeRuns = s.totalRuns;
    const beforeStriker = s.strikerKey;
    s = applyDeliveryToState(
      s,
      buildNoBallDelivery(s, P, `u-${add}`, { kind: "bat", additionalRuns: add }),
    );
    expect(s.totalRuns).toBe(beforeRuns + 1 + add);
    const undone = undoLastDelivery(s)!;
    expect(undone.totalRuns).toBe(beforeRuns);
    expect(undone.strikerKey).toBe(beforeStriker);
  });
});

describe("merge does not duplicate no-ball", () => {
  it("same clientEventId appears once", () => {
    let s = withOpeners();
    const opener = s.deliveries[0]!;
    const d = buildNoBallDelivery(s, P, "same-id", { kind: "bat", additionalRuns: 1 });
    s = applyDeliveryToState(s, d);
    const merged = mergeDeliveries([opener, d], [opener, d]);
    expect(merged).toHaveLength(2);
    const rebuilt = buildInningsStateFromDeliveries(merged, 20);
    expect(rebuilt.totalRuns).toBe(2);
    expect(rebuilt.deliveries).toHaveLength(2);
  });
});

describe("wide strike uses additional runs", () => {
  it("Wd+1 (total 2) rotates strike to non-striker", () => {
    let s = withOpeners();
    s = applyDeliveryToState(s, buildWideDelivery(s, P, "w", 1));
    expect(s.totalRuns).toBe(2);
    expect(s.strikerKey).toBe(bKey);
  });
});
