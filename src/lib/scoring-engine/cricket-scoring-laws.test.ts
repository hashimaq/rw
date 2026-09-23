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
  type NoBallRunKind,
} from "@/lib/scoring-engine/delivery-builders";
import {
  assertDeliveryRunInvariant,
  deliveryRunComponents,
} from "@/lib/scoring-engine/delivery-run-components";
import { commitInningsDeliveryUpdate } from "@/lib/scoring/commit-innings-delivery";
import { participantKey } from "@/lib/scoring-engine/utils";

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

function openInnings() {
  let s = createEmptyInningsState(20);
  s = applyDeliveryToState(s, buildNormalRunDelivery(s, P, "open", 0));
  return s;
}

function at37() {
  let s = openInnings();
  s = applyDeliveryToState(s, buildNormalRunDelivery(s, P, "t37", 37));
  expect(s.totalRuns).toBe(37);
  return s;
}

function applyNb(
  s: ReturnType<typeof createEmptyInningsState>,
  kind: NoBallRunKind,
  additional: number,
  id: string,
) {
  const d = buildNoBallDelivery(s, P, id, { kind, additionalRuns: additional });
  assertDeliveryRunInvariant(d);
  return { d, next: applyDeliveryToState(s, d) };
}

describe("MCC run component invariants", () => {
  it.each([
    ["none", 0],
    ["bat", 1],
    ["bat", 4],
    ["bat", 6],
    ["bye", 2],
    ["leg_bye", 3],
  ] as const)("no-ball %s + %i", (kind, add) => {
    const s = openInnings();
    const d = buildNoBallDelivery(s, P, "x", { kind, additionalRuns: add });
    const c = deliveryRunComponents(d);
    expect(c.totalRuns).toBe(d.totalRuns);
    expect(c.noBallRuns).toBe(1);
    expect(c.batterRuns + c.extrasRuns).toBe(d.totalRuns);
    expect(c.extrasRuns).toBe(d.extrasRuns);
    assertDeliveryRunInvariant(d);
  });
});

describe("No Ball team score from 37", () => {
  it.each([
    [0, 38],
    [1, 39],
    [2, 40],
    [3, 41],
    [4, 42],
    [5, 43],
    [6, 44],
  ] as const)("NB + bat %i → %i", (add, expected) => {
    const { next } = applyNb(at37(), "bat", add, `37-bat-${add}`);
    expect(next.totalRuns).toBe(expected);
    expect(next.extrasBreakdown.noBalls).toBe(1);
    expect(next.extras).toBe(1);
    expect(next.batters[aKey].runs).toBe(37 + add);
    expect(next.batters[aKey].balls).toBe(3);
    expect(next.legalBalls).toBe(2);
    expect(next.deliveries).toHaveLength(3);
  });
});

describe("No Ball batter vs extras attribution", () => {
  it("NB + 4 bat: batter 4, extras nb 1, team 5", () => {
    const { next, d } = applyNb(openInnings(), "bat", 4, "nb4");
    expect(d.totalRuns).toBe(5);
    expect(next.totalRuns).toBe(5);
    expect(next.batters[aKey].runs).toBe(4);
    expect(next.batters[aKey].fours).toBe(1);
    expect(next.extras).toBe(1);
    expect(next.extrasBreakdown.noBalls).toBe(1);
    expect(next.extrasBreakdown.byes).toBe(0);
  });

  it("NB + 4 bye: batter 0, byes 4, nb 1, team 5", () => {
    const { next } = applyNb(openInnings(), "bye", 4, "nb-b4");
    expect(next.totalRuns).toBe(5);
    expect(next.batters[aKey].runs).toBe(0);
    expect(next.extras).toBe(5);
    expect(next.extrasBreakdown.noBalls).toBe(1);
    expect(next.extrasBreakdown.byes).toBe(4);
  });

  it("NB + 4 leg bye: batter 0, leg byes 4, team 5", () => {
    const { next } = applyNb(openInnings(), "leg_bye", 4, "nb-lb4");
    expect(next.totalRuns).toBe(5);
    expect(next.extrasBreakdown.legByes).toBe(4);
  });
});

describe("No Ball strike (penalty excluded)", () => {
  it.each([
    [0, aKey],
    [1, bKey],
    [2, aKey],
    [3, bKey],
    [4, aKey],
    [5, bKey],
    [6, aKey],
  ] as const)("bat additional %i", (add, sk) => {
    const { next } = applyNb(openInnings(), "bat", add, `st-${add}`);
    expect(next.strikerKey).toBe(sk);
  });
});

describe("Wide (additional-runs strike)", () => {
  it.each([
    [0, aKey, 1],
    [1, bKey, 2],
    [2, aKey, 3],
    [3, bKey, 4],
    [4, aKey, 5],
    [5, bKey, 6],
    [6, aKey, 7],
  ] as const)("wide additional %i", (add, sk, total) => {
    let s = openInnings();
    const ballsBefore = s.batters[aKey].balls;
    const d = buildWideDelivery(s, P, `w-${add}`, add);
    const c = deliveryRunComponents(d);
    expect(c.batterRuns).toBe(0);
    expect(c.wideRuns).toBe(total);
    expect(c.extrasRuns).toBe(total);
    expect(d.extrasRuns).toBe(total);
    s = applyDeliveryToState(s, d);
    expect(s.totalRuns).toBe(total);
    expect(s.strikerKey).toBe(sk);
    expect(s.batters[aKey].runs).toBe(0);
    expect(s.extras).toBe(total);
    expect(s.extrasBreakdown.wides).toBe(total);
    expect(s.legalBalls).toBe(1);
    expect(s.batters[aKey].balls).toBe(ballsBefore);
    expect(d.isLegalDelivery).toBe(false);
  });
});

describe("Normal legal deliveries", () => {
  it.each([
    [0, aKey, 0],
    [1, bKey, 1],
    [2, aKey, 2],
    [4, aKey, 4],
    [6, aKey, 6],
  ] as const)("runs %i", (runs, sk, total) => {
    let s = openInnings();
    s = applyDeliveryToState(
      s,
      buildNormalRunDelivery(s, P, `n-${runs}`, runs),
    );
    expect(s.totalRuns).toBe(total);
    expect(s.strikerKey).toBe(sk);
    expect(s.batters[aKey].runs).toBe(runs);
    expect(s.legalBalls).toBe(2);
  });
});

describe("undo restores full state", () => {
  it.each([
    ["none", 0],
    ["bat", 1],
    ["bat", 4],
    ["bat", 6],
    ["bye", 1],
    ["leg_bye", 2],
  ] as const)("NB %s %i", (kind, add) => {
    let s = at37();
    const before = structuredClone(s);
    const { next } = applyNb(s, kind, add, "undo-nb");
    const undone = undoLastDelivery(next)!;
    expect(undone.totalRuns).toBe(before.totalRuns);
    expect(undone.strikerKey).toBe(before.strikerKey);
    expect(undone.extrasBreakdown).toEqual(before.extrasBreakdown);
    expect(undone.batters[aKey].runs).toBe(before.batters[aKey].runs);
  });
});

describe("rebuild from deliveries", () => {
  it("matches incremental NB + wide + normal", () => {
    let s = openInnings();
    const ids = ["a", "b", "c", "d"];
    const steps = [
      () => buildNoBallDelivery(s, P, ids[0], { kind: "bat", additionalRuns: 1 }),
      () => buildWideDelivery(s, P, ids[1], 0),
      () => buildNormalRunDelivery(s, P, ids[2], 2),
      () => buildNoBallDelivery(s, P, ids[3], { kind: "bye", additionalRuns: 3 }),
    ];
    for (const build of steps) {
      const d = build();
      s = applyDeliveryToState(s, d);
    }
    const rebuilt = buildInningsStateFromDeliveries(s.deliveries, 20);
    expect(rebuilt.totalRuns).toBe(s.totalRuns);
    expect(rebuilt.strikerKey).toBe(s.strikerKey);
    expect(rebuilt.extrasBreakdown).toEqual(s.extrasBreakdown);
    expect(rebuilt.batters[aKey].runs).toBe(s.batters[aKey].runs);
  });
});

describe("idempotent commit (Strict Mode)", () => {
  it("NB + 1 from 37 once", () => {
    const prev = at37();
    const id = "strict-nb1";
    const build = (base: typeof prev, cid: string) =>
      buildNoBallDelivery(base, P, cid, { kind: "bat", additionalRuns: 1 });
    const first = commitInningsDeliveryUpdate(prev, prev, id, build);
    const second = commitInningsDeliveryUpdate(prev, first.next, id, build);
    expect(first.next.totalRuns).toBe(39);
    expect(second.next.totalRuns).toBe(39);
    expect(second.next.deliveries).toHaveLength(3);
  });
});

describe("legal byes on normal ball", () => {
  it("bye 2 credits extras not batter", () => {
    let s = openInnings();
    s = applyDeliveryToState(s, buildByeDelivery(s, P, "b2", 2));
    expect(s.totalRuns).toBe(2);
    expect(s.batters[aKey].runs).toBe(0);
    expect(s.extrasBreakdown.byes).toBe(2);
    expect(s.legalBalls).toBe(2);
  });

  it("leg bye 3", () => {
    let s = openInnings();
    s = applyDeliveryToState(s, buildLegByeDelivery(s, P, "lb3", 3));
    expect(s.extrasBreakdown.legByes).toBe(3);
  });
});
