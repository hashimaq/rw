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
  buildWicketDelivery,
  type ActiveParticipants,
} from "@/lib/scoring-engine/delivery-builders";
import { participantKey } from "@/lib/scoring-engine/utils";
import {
  deriveScoringPhase,
  participantRefsFromEngineState,
  scoringUiSnapshotFromEngineState,
} from "@/lib/scoring/scoring-phase";

const A = "11111111-1111-4111-8111-111111111111";
const B = "22222222-2222-4222-8222-222222222222";
const C = "33333333-3333-4333-8333-333333333333";
const X = "44444444-4444-4444-8444-444444444444";

const P: ActiveParticipants = {
  strikerPlayerId: A,
  strikerName: "A",
  nonStrikerPlayerId: B,
  nonStrikerName: "B",
  bowlerPlayerId: X,
  bowlerName: "X",
};

const aKey = participantKey(A, "A");
const bKey = participantKey(B, "B");
const cKey = participantKey(C, "C");
const ctx = { inningsNumber: 1 as const };

function inningsReadyForFirstBall() {
  let s = createEmptyInningsState(20);
  s = applyDeliveryToState(
    s,
    buildCreaseCorrectionDelivery(s, P, "openers"),
  );
  expect(deriveScoringPhase(s, ctx)).toBe("scoring");
  expect(participantRefsFromEngineState(s).bowler?.name).toBe("X");
  return s;
}

function expectPreFirstBallCrease(s: ReturnType<typeof createEmptyInningsState>) {
  const snap = scoringUiSnapshotFromEngineState(s, ctx);
  expect(snap.phase).toBe("scoring");
  expect(s.wickets).toBe(0);
  expect(s.legalBalls).toBe(0);
  expect(snap.striker?.name).toBe("A");
  expect(snap.nonStriker?.name).toBe("B");
  expect(snap.bowler?.name).toBe("X");
  expect(snap.wicketReplacementSlot).toBeNull();
}

describe("first-ball wicket undo (authoritative history)", () => {
  it.each([
    ["bowled", {}],
    ["caught", { fielderName: "F" }],
    ["lbw", {}],
    ["hit_wicket", {}],
    ["stumped", { fielderName: "WK" }],
  ] as const)("%s then undo restores openers", (wicketType, extra) => {
    let s = inningsReadyForFirstBall();
    s = applyDeliveryToState(
      s,
      buildWicketDelivery(s, P, "w1", {
        wicketType,
        dismissedPlayerId: A,
        dismissedPlayerName: "A",
        ...extra,
      }),
    );
    expect(deriveScoringPhase(s, ctx)).toBe("need_batter");

    const undone = undoLastDelivery(s)!;
    expectPreFirstBallCrease(undone);
  });

  it("run out striker on first ball then undo", () => {
    let s = inningsReadyForFirstBall();
    s = applyDeliveryToState(
      s,
      buildWicketDelivery(s, P, "ro", {
        wicketType: "run_out",
        dismissedPlayerId: A,
        dismissedPlayerName: "A",
        fielderName: "F",
      }),
    );
    const undone = undoLastDelivery(s)!;
    expectPreFirstBallCrease(undone);
  });

  it("wicket + replacement + undo wicket restores A/B (two undos)", () => {
    let s = inningsReadyForFirstBall();
    s = applyDeliveryToState(
      s,
      buildWicketDelivery(s, P, "w1", {
        wicketType: "bowled",
        dismissedPlayerId: A,
        dismissedPlayerName: "A",
      }),
    );
    s = applyDeliveryToState(
      s,
      buildCreaseCorrectionDelivery(
        s,
        {
          ...P,
          strikerPlayerId: C,
          strikerName: "C",
        },
        "replace",
      ),
    );
    expect(s.strikerKey).toBe(cKey);
    expect(deriveScoringPhase(s, ctx)).toBe("scoring");

    s = undoLastDelivery(s)!;
    expect(deriveScoringPhase(s, ctx)).toBe("need_batter");

    s = undoLastDelivery(s)!;
    expectPreFirstBallCrease(s);
  });

  it("wicket after prior ball undo restores pre-wicket crease", () => {
    let s = inningsReadyForFirstBall();
    s = applyDeliveryToState(
      s,
      buildNormalRunDelivery(s, P, "b1", 4),
    );
    const beforeWicket = structuredClone(s);
    s = applyDeliveryToState(
      s,
      buildWicketDelivery(s, P, "w2", {
        wicketType: "bowled",
        dismissedPlayerId: A,
        dismissedPlayerName: "A",
      }),
    );
    const undone = undoLastDelivery(s)!;
    expect(undone.strikerKey).toBe(beforeWicket.strikerKey);
    expect(undone.nonStrikerKey).toBe(beforeWicket.nonStrikerKey);
    expect(undone.totalRuns).toBe(4);
    expect(scoringUiSnapshotFromEngineState(undone, ctx).phase).toBe("scoring");
  });

  it("rebuild after undo matches in-memory state", () => {
    let s = inningsReadyForFirstBall();
    s = applyDeliveryToState(
      s,
      buildWicketDelivery(s, P, "w1", {
        wicketType: "caught",
        dismissedPlayerId: A,
        dismissedPlayerName: "A",
        fielderName: "F",
      }),
    );
    s = undoLastDelivery(s)!;
    const rebuilt = buildInningsStateFromDeliveries(s.deliveries, 20);
    expect(rebuilt.strikerKey).toBe(aKey);
    expect(rebuilt.nonStrikerKey).toBe(bKey);
    expect(rebuilt.wickets).toBe(0);
    expect(rebuilt.batters[aKey].isOut).toBe(false);
  });

  it("bowler ref available before first scoring delivery", () => {
    const s = inningsReadyForFirstBall();
    expect(participantRefsFromEngineState(s).bowler?.name).toBe("X");
  });
});
