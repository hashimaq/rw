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
} from "@/lib/scoring-engine/delivery-builders";
import type { NoBallRunKind } from "@/lib/scoring-engine/delivery-builders";
import { participantKey } from "@/lib/scoring-engine/utils";
import { activeParticipantsForNextDelivery } from "@/lib/scoring/participants-from-state";

const A = "11111111-1111-4111-8111-111111111111";
const B = "22222222-2222-4222-8222-222222222222";
const C = "33333333-3333-4333-8333-333333333333";

const aKey = participantKey(A, "A");
const bKey = participantKey(B, "B");

describe("participants from engine state", () => {
  it("wide additional strike uses engine crease not stale hooks", () => {
    let s = createEmptyInningsState(20);
    const P0 = {
      strikerPlayerId: A,
      strikerName: "A",
      nonStrikerPlayerId: B,
      nonStrikerName: "B",
      bowlerPlayerId: C,
      bowlerName: "X",
    };
    s = applyDeliveryToState(
      s,
      buildNormalRunDelivery(s, P0, "d0", 0),
    );
    s = applyDeliveryToState(
      s,
      buildNormalRunDelivery(s, P0, "d1", 1),
    );
    expect(s.strikerKey).toBe(bKey);

    const staleHooks = {
      striker: { playerId: A, name: "A" },
      nonStriker: { playerId: B, name: "B" },
    };
    const bowler = { playerId: C, name: "X" };

    const fromHooks = buildWideDelivery(
      s,
      {
        strikerPlayerId: A,
        strikerName: "A",
        nonStrikerPlayerId: B,
        nonStrikerName: "B",
        bowlerPlayerId: C,
        bowlerName: "X",
      },
      "w-bad",
      1,
    );
    const bad = applyDeliveryToState(s, fromHooks);
    expect(bad.strikerKey).toBe(bKey);

    const engineP = activeParticipantsForNextDelivery(s, bowler, staleHooks)!;
    expect(engineP.strikerPlayerId).toBe(B);
    const fromEngine = buildWideDelivery(s, engineP, "w-good", 1);
    const good = applyDeliveryToState(s, fromEngine);
    expect(good.strikerKey).toBe(aKey);
  });

  it("no-ball +1 rotates strike when delivery uses engine crease (not stale hooks)", () => {
    let s = createEmptyInningsState(20);
    const P0 = {
      strikerPlayerId: A,
      strikerName: "A",
      nonStrikerPlayerId: B,
      nonStrikerName: "B",
      bowlerPlayerId: C,
      bowlerName: "X",
    };
    s = applyDeliveryToState(s, buildNormalRunDelivery(s, P0, "d0", 0));
    s = applyDeliveryToState(s, buildNormalRunDelivery(s, P0, "d1", 1));
    expect(s.strikerKey).toBe(bKey);

    const staleHooks = {
      striker: { playerId: A, name: "A" },
      nonStriker: { playerId: B, name: "B" },
    };
    const bowler = { playerId: C, name: "X" };

    const badDelivery = buildNoBallDelivery(s, P0, "nb-bad", {
      kind: "bat",
      additionalRuns: 1,
    });
    expect(badDelivery.totalRuns).toBe(2);
    const bad = applyDeliveryToState(s, badDelivery);
    expect(bad.strikerKey).toBe(bKey);

    const engineP = activeParticipantsForNextDelivery(s, bowler, staleHooks)!;
    const delivery = buildNoBallDelivery(s, engineP, "nb-good", {
      kind: "bat",
      additionalRuns: 1,
    });
    expect(delivery.totalRuns).toBe(2);
    expect(delivery.batterRuns).toBe(1);
    expect(delivery.extrasRuns).toBe(1);
    const good = applyDeliveryToState(s, delivery);
    expect(good.strikerKey).toBe(aKey);
  });
});

describe("no-ball strike matrix with engine crease", () => {
  const bowler = { playerId: C, name: "X" };
  const staleHooks = {
    striker: { playerId: A, name: "A" },
    nonStriker: { playerId: B, name: "B" },
  };

  function stateWithBOnStrike() {
    let s = createEmptyInningsState(20);
    const P0 = {
      strikerPlayerId: A,
      strikerName: "A",
      nonStrikerPlayerId: B,
      nonStrikerName: "B",
      bowlerPlayerId: C,
      bowlerName: "X",
    };
    s = applyDeliveryToState(s, buildNormalRunDelivery(s, P0, "d0", 0));
    s = applyDeliveryToState(s, buildNormalRunDelivery(s, P0, "d1", 1));
    expect(s.strikerKey).toBe(bKey);
    return s;
  }

  function applyNb(
    s: ReturnType<typeof createEmptyInningsState>,
    kind: NoBallRunKind,
    additionalRuns: number,
  ) {
    const P = activeParticipantsForNextDelivery(s, bowler, staleHooks)!;
    const d = buildNoBallDelivery(s, P, crypto.randomUUID(), {
      kind,
      additionalRuns,
    });
    const next = applyDeliveryToState(s, d);
    return { d, next };
  }

  it.each([
    ["none", 0, bKey, 1],
    ["bat", 1, aKey, 2],
    ["bat", 2, bKey, 3],
    ["bat", 3, aKey, 4],
    ["bat", 4, bKey, 5],
    ["bat", 5, aKey, 6],
    ["bat", 6, bKey, 7],
    ["bye", 0, bKey, 1],
    ["bye", 1, aKey, 2],
    ["bye", 2, bKey, 3],
    ["bye", 3, aKey, 4],
    ["bye", 4, bKey, 5],
    ["leg_bye", 0, bKey, 1],
    ["leg_bye", 1, aKey, 2],
    ["leg_bye", 2, bKey, 3],
    ["leg_bye", 3, aKey, 4],
    ["leg_bye", 4, bKey, 5],
  ] as const)(
    "no-ball strike matrix",
    (kind, add, expectedStriker, expectedTotal) => {
      const s = stateWithBOnStrike();
      const { d, next } = applyNb(s, kind, add);
      expect(d.totalRuns).toBe(expectedTotal);
      expect(next.strikerKey).toBe(expectedStriker);
    },
  );

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
  ] as const)("undo NB + %s %i restores crease (even additional)", (kind, add) => {
    const s = stateWithBOnStrike();
    const before = s.strikerKey;
    const { next } = applyNb(s, kind, add);
    expect(next.strikerKey).toBe(before);
    const restored = undoLastDelivery(next)!;
    expect(restored.strikerKey).toBe(before);
  });

  it.each([
    ["bat", 1],
    ["bat", 3],
    ["bye", 1],
    ["bye", 3],
    ["leg_bye", 1],
    ["leg_bye", 3],
  ] as const)("undo NB + %s %i restores crease (odd additional)", (kind, add) => {
    const s = stateWithBOnStrike();
    const before = s.strikerKey;
    const { next } = applyNb(s, kind, add);
    expect(next.strikerKey).not.toBe(before);
    const restored = undoLastDelivery(next)!;
    expect(restored.strikerKey).toBe(before);
  });
});
