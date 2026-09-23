import { describe, expect, it } from "vitest";
import {
  applyDeliveryToState,
  buildInningsStateFromDeliveries,
  createEmptyInningsState,
  undoLastDelivery,
} from "@/lib/scoring-engine/build-state";
import {
  buildNoBallWicketDelivery,
  buildNormalRunDelivery,
  buildWideWicketDelivery,
  buildWicketDelivery,
  type ActiveParticipants,
} from "@/lib/scoring-engine/delivery-builders";
import { deliveryRunComponents } from "@/lib/scoring-engine/delivery-run-components";
import { participantKey } from "@/lib/scoring-engine/utils";
import {
  isWicketTypeAllowedOnExtra,
  wicketOnExtraRejectionMessage,
} from "@/lib/scoring/wicket-legality";

const A = "11111111-1111-4111-8111-111111111111";
const B = "22222222-2222-4222-8222-222222222222";
const C = "33333333-3333-4333-8333-333333333333";
const F = "44444444-4444-4444-8444-444444444444";

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

const ro = {
  wicketType: "run_out" as const,
  fielderPlayerId: F,
  fielderName: "Fielder",
};

function open() {
  let s = createEmptyInningsState(20);
  s = applyDeliveryToState(s, buildNormalRunDelivery(s, P, "o", 0));
  return s;
}

describe("wicket legality on extras (MCC 21.18 / 22)", () => {
  it("rejects bowled/caught/lbw/stumped/hit_wicket on no-ball", () => {
    for (const wt of [
      "bowled",
      "caught",
      "lbw",
      "stumped",
      "hit_wicket",
    ] as const) {
      expect(isWicketTypeAllowedOnExtra(wt, "no_ball")).toBe(false);
      expect(() =>
        buildNoBallWicketDelivery(open(), P, "x", {
          kind: "none",
          additionalRuns: 0,
          wicketType: wt,
          dismissedPlayerId: A,
          dismissedPlayerName: "A",
        }),
      ).toThrow(wicketOnExtraRejectionMessage(wt, "no_ball"));
    }
  });

  it("allows run out on no-ball and wide", () => {
    expect(isWicketTypeAllowedOnExtra("run_out", "no_ball")).toBe(true);
    expect(isWicketTypeAllowedOnExtra("run_out", "wide")).toBe(true);
  });
});

describe("no-ball + run out (same delivery)", () => {
  it("NB + 0 + RO: total 1, legal false, batter 0 balls unchanged on NB", () => {
    let s = open();
    const d = buildNoBallWicketDelivery(s, P, "nb0ro", {
      kind: "none",
      additionalRuns: 0,
      ...ro,
      dismissedPlayerId: B,
      dismissedPlayerName: "B",
    });
    expect(deliveryRunComponents(d).noBallRuns).toBe(1);
    s = applyDeliveryToState(s, d);
    expect(s.totalRuns).toBe(1);
    expect(s.extrasBreakdown.noBalls).toBe(1);
    expect(s.batters[aKey].runs).toBe(0);
    expect(s.batters[aKey].balls).toBe(1);
    expect(s.batters[bKey].isOut).toBe(true);
    expect(s.legalBalls).toBe(1);
    expect(s.wickets).toBe(1);
    expect(d.isLegalDelivery).toBe(false);
  });

  it("NB + 1 bat + RO non-striker: total 2, batter +1, dismissed B", () => {
    let s = open();
    const d = buildNoBallWicketDelivery(s, P, "nb1ro", {
      kind: "bat",
      additionalRuns: 1,
      ...ro,
      dismissedPlayerId: B,
      dismissedPlayerName: "B",
    });
    s = applyDeliveryToState(s, d);
    expect(s.totalRuns).toBe(2);
    expect(s.batters[aKey].runs).toBe(1);
    expect(s.extrasBreakdown.noBalls).toBe(1);
    expect(s.batters[bKey].isOut).toBe(true);
    expect(s.batters[bKey].balls).toBe(0);
    expect(s.deliveries[s.deliveries.length - 1]!.fielderName).toBe("Fielder");
  });

  it("NB + 2 bat + RO: total 3, batter +2", () => {
    let s = open();
    s = applyDeliveryToState(
      s,
      buildNoBallWicketDelivery(s, P, "nb2ro", {
        kind: "bat",
        additionalRuns: 2,
        ...ro,
        dismissedPlayerId: A,
        dismissedPlayerName: "A",
      }),
    );
    expect(s.totalRuns).toBe(3);
    expect(s.batters[aKey].runs).toBe(2);
    expect(s.wickets).toBe(1);
  });

  it("NB + 1 bye + RO", () => {
    let s = open();
    s = applyDeliveryToState(
      s,
      buildNoBallWicketDelivery(s, P, "nbb1", {
        kind: "bye",
        additionalRuns: 1,
        ...ro,
        dismissedPlayerId: B,
        dismissedPlayerName: "B",
      }),
    );
    expect(s.totalRuns).toBe(2);
    expect(s.batters[aKey].runs).toBe(0);
    expect(s.extrasBreakdown.byes).toBe(1);
    expect(s.extrasBreakdown.noBalls).toBe(1);
  });

  it("NB + 1 leg bye + RO", () => {
    let s = open();
    s = applyDeliveryToState(
      s,
      buildNoBallWicketDelivery(s, P, "nblb1", {
        kind: "leg_bye",
        additionalRuns: 1,
        ...ro,
        dismissedPlayerId: B,
        dismissedPlayerName: "B",
      }),
    );
    expect(s.extrasBreakdown.legByes).toBe(1);
    expect(s.totalRuns).toBe(2);
  });
});

describe("wide + run out", () => {
  it.each([0, 1, 2, 3] as const)("wide additional %i + RO", (add) => {
    let s = open();
    const total = 1 + add;
    const d = buildWideWicketDelivery(s, P, `w${add}ro`, add, {
      ...ro,
      dismissedPlayerId: B,
      dismissedPlayerName: "B",
    });
    s = applyDeliveryToState(s, d);
    expect(s.totalRuns).toBe(total);
    expect(s.batters[aKey].runs).toBe(0);
    expect(s.extrasBreakdown.wides).toBe(total);
    expect(s.legalBalls).toBe(1);
    expect(s.wickets).toBe(1);
  });
});

describe("undo / rebuild on extra wickets", () => {
  it("undo NB + 1 bat + RO restores score and crease", () => {
    let s = open();
    const before = structuredClone(s);
    s = applyDeliveryToState(
      s,
      buildNoBallWicketDelivery(s, P, "u", {
        kind: "bat",
        additionalRuns: 1,
        ...ro,
        dismissedPlayerId: B,
        dismissedPlayerName: "B",
      }),
    );
    const undone = undoLastDelivery(s)!;
    expect(undone.totalRuns).toBe(before.totalRuns);
    expect(undone.wickets).toBe(0);
    expect(undone.strikerKey).toBe(before.strikerKey);
    expect(undone.batters[bKey].isOut).toBe(false);
  });

  it("rebuild matches live after wide + RO", () => {
    let s = open();
    s = applyDeliveryToState(
      s,
      buildWideWicketDelivery(s, P, "w1ro", 1, {
        ...ro,
        dismissedPlayerId: B,
        dismissedPlayerName: "B",
      }),
    );
    const rebuilt = buildInningsStateFromDeliveries(s.deliveries, 20);
    expect(rebuilt.totalRuns).toBe(s.totalRuns);
    expect(rebuilt.wickets).toBe(s.wickets);
    expect(rebuilt.extrasBreakdown).toEqual(s.extrasBreakdown);
  });
});

describe("normal wicket finalizeDelivery", () => {
  it("legal bowled dot validates invariants", () => {
    let s = open();
    const w = buildWicketDelivery(s, P, "w", {
      wicketType: "bowled",
      dismissedPlayerId: A,
      dismissedPlayerName: "A",
    });
    expect(w.isLegalDelivery).toBe(true);
    s = applyDeliveryToState(s, w);
    expect(s.wickets).toBe(1);
  });
});

describe("unsupported product scope", () => {
  it("documents: free-hit state is not in engine", () => {
    expect("freeHit" in createEmptyInningsState(20)).toBe(false);
  });

  it("penalty extra type exists but no scorer builder", () => {
    expect(isWicketTypeAllowedOnExtra("run_out", "penalty")).toBe(false);
  });
});
