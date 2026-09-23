import { describe, expect, it } from "vitest";
import {
  applyDeliveryToState,
  buildInningsStateFromDeliveries,
  createEmptyInningsState,
} from "@/lib/scoring-engine/build-state";
import {
  buildNoBallDelivery,
  buildNormalRunDelivery,
  type ActiveParticipants,
} from "@/lib/scoring-engine/delivery-builders";
import { commitInningsDeliveryUpdate } from "@/lib/scoring/commit-innings-delivery";

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

function inningsAt37() {
  let s = createEmptyInningsState(20);
  s = applyDeliveryToState(
    s,
    buildNormalRunDelivery(s, P, "open", 0),
  );
  s = applyDeliveryToState(
    s,
    buildNormalRunDelivery(s, P, "seed", 37),
  );
  expect(s.totalRuns).toBe(37);
  return s;
}

describe("commitInningsDeliveryUpdate idempotency", () => {
  it("NB + 1 from 37 adds exactly 2 runs once (Strict Mode double updater)", () => {
    const prev = inningsAt37();
    let ref = prev;
    const clientEventId = "00000000-0000-4000-8000-000000000099";
    const build = (base: typeof prev, id: string) =>
      buildNoBallDelivery(base, P, id, { kind: "bat", additionalRuns: 1 });

    const first = commitInningsDeliveryUpdate(prev, ref, clientEventId, build);
    ref = first.next;
    expect(first.skippedDuplicate).toBe(false);
    expect(first.next.totalRuns).toBe(39);
    expect(first.next.deliveries).toHaveLength(3);
    expect(first.delivery?.totalRuns).toBe(2);

    const second = commitInningsDeliveryUpdate(prev, ref, clientEventId, build);
    expect(second.skippedDuplicate).toBe(true);
    expect(second.next.totalRuns).toBe(39);
    expect(second.next.deliveries).toHaveLength(3);
  });

  it.each([
    [0, 38],
    [1, 39],
    [2, 40],
    [3, 41],
    [4, 42],
    [5, 43],
    [6, 44],
  ] as const)("NB + bat %i from 37 → %i", (additional, expected) => {
    let s = inningsAt37();
    const id = `nb-bat-${additional}`;
    const r = commitInningsDeliveryUpdate(s, s, id, (base, clientEventId) =>
      buildNoBallDelivery(base, P, clientEventId, {
        kind: "bat",
        additionalRuns: additional,
      }),
    );
    s = r.next;
    expect(s.totalRuns).toBe(expected);
    expect(r.delivery?.totalRuns).toBe(1 + additional);
    expect(s.extrasBreakdown.noBalls).toBe(1);
    expect(s.deliveries).toHaveLength(3);
  });
});

describe("rebuild from deliveries", () => {
  it("matches incremental NB + 1 from 37", () => {
    let s = inningsAt37();
    const id = "rebuild-nb1";
    s = commitInningsDeliveryUpdate(s, s, id, (base, clientEventId) =>
      buildNoBallDelivery(base, P, clientEventId, {
        kind: "bat",
        additionalRuns: 1,
      }),
    ).next;
    const rebuilt = buildInningsStateFromDeliveries(s.deliveries, 20);
    expect(rebuilt.totalRuns).toBe(39);
    expect(rebuilt.deliveries).toHaveLength(3);
  });
});
