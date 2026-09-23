import { describe, expect, it } from "vitest";
import {
  applyDeliveryToState,
  buildInningsStateFromDeliveries,
  createEmptyInningsState,
  liveSummary,
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
import { assertDeliveryRunInvariant } from "@/lib/scoring-engine/delivery-run-components";

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

type Op =
  | { t: "run"; n: number }
  | { t: "wide"; n: number }
  | { t: "nb"; kind: "bat" | "bye" | "leg_bye" | "none"; n: number }
  | { t: "bye"; n: number }
  | { t: "undo" };

function applyOp(
  s: ReturnType<typeof createEmptyInningsState>,
  op: Op,
  seq: number,
) {
  if (op.t === "undo") {
    return undoLastDelivery(s) ?? s;
  }
  const id = `p-${seq}`;
  let d;
  if (op.t === "run") d = buildNormalRunDelivery(s, P, id, op.n);
  else if (op.t === "wide") d = buildWideDelivery(s, P, id, op.n);
  else if (op.t === "nb") {
    d = buildNoBallDelivery(s, P, id, { kind: op.kind, additionalRuns: op.n });
  } else d = buildByeDelivery(s, P, id, op.n);
  assertDeliveryRunInvariant(d);
  return applyDeliveryToState(s, d);
}

describe("randomized scoring sequences", () => {
  it("rebuild and liveSummary match after mixed ops", () => {
    let s = createEmptyInningsState(20);
    s = applyDeliveryToState(s, buildNormalRunDelivery(s, P, "open", 0));

    const ops: Op[] = [
      { t: "run", n: 1 },
      { t: "wide", n: 0 },
      { t: "nb", kind: "bat", n: 2 },
      { t: "bye", n: 1 },
      { t: "run", n: 4 },
      { t: "nb", kind: "bye", n: 1 },
      { t: "wide", n: 2 },
      { t: "undo" },
      { t: "run", n: 0 },
    ];

    let seq = 0;
    for (const op of ops) {
      seq += 1;
      s = applyOp(s, op, seq);
      const sumDeliveries = s.deliveries.reduce((acc, d) => acc + d.totalRuns, 0);
      expect(s.totalRuns).toBe(sumDeliveries);
      const rebuilt = buildInningsStateFromDeliveries(s.deliveries, 20);
      expect(rebuilt.totalRuns).toBe(s.totalRuns);
      expect(rebuilt.strikerKey).toBe(s.strikerKey);
      expect(liveSummary(rebuilt).totalRuns).toBe(liveSummary(s).totalRuns);
    }

    const ids = new Set(s.deliveries.map((d) => d.clientEventId));
    expect(ids.size).toBe(s.deliveries.length);
  });

  it("leg bye sequences preserve invariants", () => {
    let s = createEmptyInningsState(20);
    s = applyDeliveryToState(s, buildNormalRunDelivery(s, P, "o", 0));
    for (let i = 0; i < 8; i += 1) {
      const d = buildLegByeDelivery(s, P, `lb-${i}`, (i % 3) + 1);
      assertDeliveryRunInvariant(d);
      s = applyDeliveryToState(s, d);
      expect(s.totalRuns).toBe(
        s.deliveries.reduce((a, x) => a + x.totalRuns, 0),
      );
    }
  });
});
