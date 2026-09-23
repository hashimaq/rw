import { describe, expect, it } from "vitest";
import {
  applyDeliveryToState,
  buildInningsStateFromDeliveries,
  createEmptyInningsState,
  undoLastDelivery,
} from "@/lib/scoring-engine/build-state";
import {
  buildCreaseCorrectionDelivery,
  buildNormalRunDelivery,
  buildNoBallDelivery,
  buildWideDelivery,
  type ActiveParticipants,
} from "@/lib/scoring-engine/delivery-builders";
import { participantKey } from "@/lib/scoring-engine/utils";
import { authoritativeCreaseRefs } from "@/lib/scoring/crease-sync";

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

function open() {
  let s = createEmptyInningsState(20);
  s = applyDeliveryToState(s, buildNormalRunDelivery(s, P, "o", 0));
  return s;
}

function manualStriker(
  s: ReturnType<typeof createEmptyInningsState>,
  strikerId: string,
  strikerName: string,
  id: string,
) {
  const nsKey = s.strikerKey === aKey ? bKey : aKey;
  const ns = s.batters[nsKey]!;
  return applyDeliveryToState(
    s,
    buildCreaseCorrectionDelivery(
      s,
      {
        strikerPlayerId: strikerId,
        strikerName,
        nonStrikerPlayerId: ns.playerId,
        nonStrikerName: ns.name,
        bowlerPlayerId: C,
        bowlerName: "X",
      },
      id,
    ),
  );
}

describe("manual striker correction", () => {
  it("tap non-striker then tap striker", () => {
    let s = open();
    expect(s.strikerKey).toBe(aKey);
    s = manualStriker(s, B, "B", "m1");
    expect(s.strikerKey).toBe(bKey);
    s = manualStriker(s, A, "A", "m2");
    expect(s.strikerKey).toBe(aKey);
    expect(s.totalRuns).toBe(0);
    expect(s.batters[aKey].runs).toBe(0);
  });

  it("after wide automatic strike, manual correction restores A", () => {
    let s = open();
    s = applyDeliveryToState(s, buildWideDelivery(s, P, "w", 1));
    expect(s.strikerKey).toBe(bKey);
    s = manualStriker(s, A, "A", "fix");
    expect(s.strikerKey).toBe(aKey);
  });

  it.each([0, 1, 4] as const)("after NB+bat %i", (add) => {
    let s = open();
    s = applyDeliveryToState(
      s,
      buildNoBallDelivery(s, P, `nb${add}`, { kind: "bat", additionalRuns: add }),
    );
    s = manualStriker(s, A, "A", `fix-${add}`);
    expect(s.strikerKey).toBe(aKey);
  });

  it.each([0, 1, 2, 4, 6] as const)("after normal %i", (runs) => {
    let s = open();
    s = applyDeliveryToState(
      s,
      buildNormalRunDelivery(s, P, `n${runs}`, runs),
    );
    const beforeRuns = s.totalRuns;
    s = manualStriker(s, B, "B", `fix-${runs}`);
    expect(s.totalRuns).toBe(beforeRuns);
    expect(s.strikerKey).toBe(bKey);
  });

  it("undo delivery keeps manual correction before that delivery", () => {
    let s = open();
    s = manualStriker(s, B, "B", "manual");
    expect(s.strikerKey).toBe(bKey);
    s = applyDeliveryToState(
      s,
      buildNormalRunDelivery(
        s,
        {
          strikerPlayerId: B,
          strikerName: "B",
          nonStrikerPlayerId: A,
          nonStrikerName: "A",
          bowlerPlayerId: C,
          bowlerName: "X",
        },
        "d1",
        1,
      ),
    );
    expect(s.strikerKey).toBe(aKey);
    const undone = undoLastDelivery(s)!;
    expect(undone.strikerKey).toBe(bKey);
  });

  it("rebuild includes crease corrections", () => {
    let s = open();
    s = manualStriker(s, B, "B", "m");
    s = applyDeliveryToState(s, buildNormalRunDelivery(s, P, "d", 4));
    const rebuilt = buildInningsStateFromDeliveries(s.deliveries, 20);
    expect(rebuilt.strikerKey).toBe(rebuilt.strikerKey);
    expect(rebuilt.totalRuns).toBe(4);
    expect(rebuilt.deliveries).toHaveLength(3);
  });

  it("authoritative crease before first delivery uses pending hooks", () => {
    const s = createEmptyInningsState(20);
    const c = authoritativeCreaseRefs(s, {
      striker: { playerId: A, name: "A" },
      nonStriker: { playerId: B, name: "B" },
    });
    expect(c.striker?.name).toBe("A");
    expect(c.nonStriker?.name).toBe("B");
  });
});
