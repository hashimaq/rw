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
import type { DeliveryInput } from "@/lib/scoring-engine/types";
import {
  deliveryRunComponents,
  assertDeliveryRunInvariant,
} from "@/lib/scoring-engine/delivery-run-components";
import { formatDeliveryLabel } from "@/lib/scoring-engine/format-ball";
import { shouldSwapStrikeForDelivery } from "@/lib/scoring-engine/strike-change";
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

function assertComponentModel(d: ReturnType<typeof buildWideDelivery>) {
  const c = deliveryRunComponents(d);
  assertDeliveryRunInvariant(d);
  expect(c.totalRuns).toBe(c.batterRuns + c.extrasRuns);
  expect(c.extrasRuns).toBe(
    c.noBallRuns + c.wideRuns + c.byeRuns + c.legByeRuns + c.penaltyRuns,
  );
  expect(d.extrasRuns).toBe(c.extrasRuns);
}

describe("delivery accounting audit — wide matrix", () => {
  it.each([
    [0, 1, aKey],
    [1, 2, bKey],
    [2, 3, aKey],
    [3, 4, bKey],
    [4, 5, aKey],
    [5, 6, bKey],
    [6, 7, aKey],
  ] as const)("Wide + %i", (additional, teamTotal, strikerAfter) => {
    const s = openInnings();
    const ballsBefore = s.batters[aKey].balls;
    const d = buildWideDelivery(s, P, `w-${additional}`, additional);
    assertComponentModel(d);
    expect(d.batterRuns).toBe(0);
    expect(formatDeliveryLabel(d)).toBe(`Wd+${additional}`);
    const next = applyDeliveryToState(s, d);
    expect(next.totalRuns).toBe(teamTotal);
    expect(next.extras).toBe(teamTotal);
    expect(next.extrasBreakdown.wides).toBe(teamTotal);
    expect(next.batters[aKey].runs).toBe(0);
    expect(next.batters[aKey].balls).toBe(ballsBefore);
    expect(next.strikerKey).toBe(strikerAfter);
    expect(shouldSwapStrikeForDelivery(d)).toBe(additional % 2 === 1);
  });
});

describe("delivery accounting audit — no-ball bat", () => {
  it.each([0, 1, 2, 3, 4, 5, 6] as const)("NB + %i bat", (bat) => {
    const s = openInnings();
    const ballsBefore = s.batters[aKey].balls;
    const d = buildNoBallDelivery(s, P, `nb-b-${bat}`, {
      kind: "bat",
      additionalRuns: bat,
    });
    assertComponentModel(d);
    expect(d.totalRuns).toBe(1 + bat);
    expect(d.batterRuns).toBe(bat);
    expect(deliveryRunComponents(d).noBallRuns).toBe(1);
    expect(deliveryRunComponents(d).extrasRuns).toBe(1);
    const next = applyDeliveryToState(s, d);
    expect(next.totalRuns).toBe(1 + bat);
    expect(next.extras).toBe(1);
    expect(next.batters[aKey].runs).toBe(bat);
    expect(next.batters[aKey].balls).toBe(ballsBefore + 1);
    expect(next.legalBalls).toBe(1);
  });
});

describe("delivery accounting audit — no-ball bye/leg bye balls faced", () => {
  it.each([
    ["bye", 2],
    ["leg_bye", 3],
    ["none", 0],
  ] as const)("%s additional %i does not add ball faced", (kind, add) => {
    const s = openInnings();
    const ballsBefore = s.batters[aKey].balls;
    const d = buildNoBallDelivery(s, P, `nb-${kind}`, {
      kind,
      additionalRuns: add,
    });
    const next = applyDeliveryToState(s, d);
    expect(next.batters[aKey].balls).toBe(ballsBefore);
    expect(next.batters[aKey].runs).toBe(0);
  });
});

describe("delivery accounting audit — legal bye and leg bye", () => {
  it.each([1, 2, 3] as const)("%i bye", (runs) => {
    const s = openInnings();
    const ballsBefore = s.batters[aKey].balls;
    const d = buildByeDelivery(s, P, `b-${runs}`, runs);
    assertComponentModel(d);
    const next = applyDeliveryToState(s, d);
    expect(next.batters[aKey].runs).toBe(0);
    expect(next.batters[aKey].balls).toBe(ballsBefore + 1);
    expect(next.extrasBreakdown.byes).toBe(runs);
  });

  it.each([1, 2, 3] as const)("%i leg bye", (runs) => {
    const s = openInnings();
    const ballsBefore = s.batters[aKey].balls;
    const d = buildLegByeDelivery(s, P, `lb-${runs}`, runs);
    assertComponentModel(d);
    const next = applyDeliveryToState(s, d);
    expect(next.batters[aKey].runs).toBe(0);
    expect(next.batters[aKey].balls).toBe(ballsBefore + 1);
    expect(next.extrasBreakdown.legByes).toBe(runs);
  });
});

describe("delivery accounting audit — normal legal", () => {
  it.each([
    [0, aKey, 0],
    [1, bKey, 1],
    [2, aKey, 2],
    [3, bKey, 3],
    [4, aKey, 4],
    [5, bKey, 5],
    [6, aKey, 6],
  ] as const)("runs %i", (runs, sk, total) => {
    const s = openInnings();
    const ballsBefore = s.batters[aKey].balls;
    const d = buildNormalRunDelivery(s, P, `n-${runs}`, runs);
    assertComponentModel(d);
    const next = applyDeliveryToState(s, d);
    expect(next.totalRuns).toBe(total);
    expect(next.batters[aKey].runs).toBe(runs);
    expect(next.extras).toBe(0);
    expect(next.batters[aKey].balls).toBe(ballsBefore + 1);
    expect(next.strikerKey).toBe(sk);
    if (runs === 4) expect(next.batters[aKey].fours).toBe(1);
    if (runs === 6) expect(next.batters[aKey].sixes).toBe(1);
  });
});

describe("scorecard scenarios from 37", () => {
  it("A: Wide +0 → 38, wides +1, batter unchanged", () => {
    let s = at37();
    const batterRuns = s.batters[aKey].runs;
    const balls = s.batters[aKey].balls;
    s = applyDeliveryToState(s, buildWideDelivery(s, P, "A", 0));
    expect(s.totalRuns).toBe(38);
    expect(s.batters[aKey].runs).toBe(batterRuns);
    expect(s.batters[aKey].balls).toBe(balls);
    expect(s.extrasBreakdown.wides).toBe(1);
  });

  it("B: NB +1 bat → 39, batter +1, NB extra 1, strike change", () => {
    let s = at37();
    s = applyDeliveryToState(
      s,
      buildNoBallDelivery(s, P, "B", { kind: "bat", additionalRuns: 1 }),
    );
    expect(s.totalRuns).toBe(39);
    expect(s.batters[aKey].runs).toBe(38);
    expect(s.extras).toBe(1);
    expect(s.extrasBreakdown.noBalls).toBe(1);
    expect(s.strikerKey).toBe(bKey);
  });

  it("C: NB +4 bat → 42, four, total extras on innings includes prior", () => {
    let s = at37();
    s = applyDeliveryToState(
      s,
      buildNoBallDelivery(s, P, "C", { kind: "bat", additionalRuns: 4 }),
    );
    expect(s.totalRuns).toBe(42);
    expect(s.batters[aKey].runs).toBe(41);
    expect(s.batters[aKey].fours).toBe(1);
    expect(s.extrasBreakdown.noBalls).toBe(1);
  });

  it("D: NB +4 bye → 42, byes 4, batter 0 on delivery", () => {
    let s = at37();
    s = applyDeliveryToState(
      s,
      buildNoBallDelivery(s, P, "D", { kind: "bye", additionalRuns: 4 }),
    );
    expect(s.totalRuns).toBe(42);
    expect(s.batters[aKey].runs).toBe(37);
    expect(s.extrasBreakdown.byes).toBe(4);
    expect(s.extrasBreakdown.noBalls).toBe(1);
    expect(s.extras).toBe(5);
  });
});

describe("undo on scorecard scenarios", () => {
  it.each([
    ["wide", () => buildWideDelivery(at37(), P, "u-w", 0)],
    [
      "nb-bat-1",
      () =>
        buildNoBallDelivery(at37(), P, "u-n1", {
          kind: "bat",
          additionalRuns: 1,
        }),
    ],
    [
      "nb-bat-4",
      () =>
        buildNoBallDelivery(at37(), P, "u-n4", {
          kind: "bat",
          additionalRuns: 4,
        }),
    ],
    [
      "nb-bye-4",
      () =>
        buildNoBallDelivery(at37(), P, "u-nb4", {
          kind: "bye",
          additionalRuns: 4,
        }),
    ],
  ] as const)("%s from 37", (_label, build) => {
    let s = at37();
    const before = structuredClone(s);
    s = applyDeliveryToState(s, build());
    const undone = undoLastDelivery(s)!;
    expect(undone.totalRuns).toBe(before.totalRuns);
    expect(undone.batters[aKey].runs).toBe(before.batters[aKey].runs);
    expect(undone.batters[aKey].balls).toBe(before.batters[aKey].balls);
    expect(undone.extrasBreakdown).toEqual(before.extrasBreakdown);
  });
});

describe("wide strike combinations", () => {
  it("Wd+1 then wicket rebuild preserves strike path", () => {
    let s = openInnings();
    s = applyDeliveryToState(s, buildWideDelivery(s, P, "w1", 1));
    expect(s.strikerKey).toBe(bKey);
    const rebuilt = buildInningsStateFromDeliveries(s.deliveries, 20);
    expect(rebuilt.strikerKey).toBe(bKey);
  });

  it("Wd+2 keeps striker then rebuild matches", () => {
    let s = openInnings();
    s = applyDeliveryToState(s, buildWideDelivery(s, P, "w2", 2));
    expect(s.strikerKey).toBe(aKey);
    const rebuilt = buildInningsStateFromDeliveries(s.deliveries, 20);
    expect(rebuilt.strikerKey).toBe(aKey);
  });
});

describe("rebuild matches incremental for mixed extras", () => {
  it("wide +0, NB bat, bye, leg bye", () => {
    let s = createEmptyInningsState(20);
    const list: DeliveryInput[] = [];
    const open = buildNormalRunDelivery(s, P, "open", 0);
    list.push(open);
    s = applyDeliveryToState(s, open);
    for (const build of [
      () => buildWideDelivery(s, P, "1", 0),
      () => buildNoBallDelivery(s, P, "2", { kind: "bat", additionalRuns: 2 }),
      () => buildByeDelivery(s, P, "3", 1),
      () => buildLegByeDelivery(s, P, "4", 2),
    ]) {
      const d = build();
      list.push(d);
      s = applyDeliveryToState(s, d);
    }
    const rebuilt = buildInningsStateFromDeliveries(list, 20);
    expect(rebuilt.totalRuns).toBe(s.totalRuns);
    expect(rebuilt.extrasBreakdown).toEqual(s.extrasBreakdown);
    expect(rebuilt.batters[aKey].balls).toBe(s.batters[aKey].balls);
  });
});
