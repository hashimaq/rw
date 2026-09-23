import { describe, expect, it } from "vitest";
import {
  applyDeliveryToState,
  createEmptyInningsState,
  undoLastDelivery,
} from "@/lib/scoring-engine/build-state";
import {
  buildNormalRunDelivery,
  buildWideDelivery,
  buildWicketDelivery,
  type ActiveParticipants,
} from "@/lib/scoring-engine/delivery-builders";
import { participantKey } from "@/lib/scoring-engine/utils";
import { syncCreaseRefsFromEngineState } from "@/lib/scoring/crease-sync";
import {
  activeBattersAtCrease,
  deriveScoringPhase,
  scoringUiSnapshotFromEngineState,
  wicketReplacementSlotFromEngineState,
} from "@/lib/scoring/scoring-phase";

const A = "11111111-1111-4111-8111-111111111111";
const B = "22222222-2222-4222-8222-222222222222";
const C = "33333333-3333-4333-8333-333333333333";

const P: ActiveParticipants = {
  strikerPlayerId: A,
  strikerName: "Batter A",
  nonStrikerPlayerId: B,
  nonStrikerName: "Batter B",
  bowlerPlayerId: C,
  bowlerName: "Bowler X",
};

const ctx = { inningsNumber: 1 as const };

function uuid(n: number) {
  return `${String(n).padStart(8, "0")}-0000-4000-8000-000000000001`;
}

describe("undo restores authoritative scoring UI snapshot", () => {
  it("normal delivery undo returns to scoring with same batters", () => {
    let s = createEmptyInningsState(20);
    s = applyDeliveryToState(s, buildNormalRunDelivery(s, P, uuid(1), 4));
    s = applyDeliveryToState(s, buildNormalRunDelivery(s, P, uuid(2), 2));
    const undone = undoLastDelivery(s)!;
    const snap = scoringUiSnapshotFromEngineState(undone, ctx);
    expect(snap.phase).toBe("scoring");
    expect(undone.totalRuns).toBe(4);
    expect(snap.striker?.name).toBe("Batter A");
    expect(snap.nonStriker?.name).toBe("Batter B");
  });

  it("wicket undo restores both batters and scoring phase (bowled striker)", () => {
    let s = createEmptyInningsState(20);
    s = applyDeliveryToState(s, buildNormalRunDelivery(s, P, uuid(1), 4));
    const w = buildWicketDelivery(s, P, uuid(2), {
      wicketType: "bowled",
      dismissedPlayerId: A,
      dismissedPlayerName: "Batter A",
    });
    s = applyDeliveryToState(s, w);
    expect(deriveScoringPhase(s, ctx)).toBe("need_batter");
    expect(activeBattersAtCrease(s)).toBe(1);

    const undone = undoLastDelivery(s)!;
    const snap = scoringUiSnapshotFromEngineState(undone, ctx);
    expect(undone.wickets).toBe(0);
    expect(undone.fallOfWickets.length).toBe(0);
    expect(activeBattersAtCrease(undone)).toBe(2);
    expect(snap.phase).toBe("scoring");
    expect(snap.wicketReplacementSlot).toBeNull();
    expect(participantKey(snap.striker!.playerId, snap.striker!.name)).toBe(
      participantKey(A, "Batter A"),
    );
    expect(snap.nonStriker?.name).toBe("Batter B");
  });

  it("caught wicket undo restores pre-wicket crease (including strike)", () => {
    let s = createEmptyInningsState(20);
    s = applyDeliveryToState(s, buildNormalRunDelivery(s, P, uuid(1), 1));
    const beforeWicket = structuredClone(s);
    s = applyDeliveryToState(
      s,
      buildWicketDelivery(s, P, uuid(2), {
        wicketType: "caught",
        dismissedPlayerId: beforeWicket.strikerKey === participantKey(A, "Batter A")
          ? A
          : B,
        dismissedPlayerName:
          beforeWicket.strikerKey === participantKey(A, "Batter A")
            ? "Batter A"
            : "Batter B",
        fielderName: "Fielder",
      }),
    );
    const undone = undoLastDelivery(s)!;
    const crease = syncCreaseRefsFromEngineState(undone);
    expect(undone.strikerKey).toBe(beforeWicket.strikerKey);
    expect(undone.nonStrikerKey).toBe(beforeWicket.nonStrikerKey);
    expect(crease.striker?.name).toBe(
      beforeWicket.batters[beforeWicket.strikerKey!]!.name,
    );
    expect(scoringUiSnapshotFromEngineState(undone, ctx).phase).toBe("scoring");
  });

  it("run out non-striker undo restores both ends", () => {
    let s = createEmptyInningsState(20);
    s = applyDeliveryToState(s, buildNormalRunDelivery(s, P, uuid(1), 0));
    s = applyDeliveryToState(
      s,
      buildWicketDelivery(s, P, uuid(2), {
        wicketType: "run_out",
        dismissedPlayerId: B,
        dismissedPlayerName: "Batter B",
        fielderName: "Fielder",
      }),
    );
    expect(wicketReplacementSlotFromEngineState(s)).toBe("non_striker");
    const undone = undoLastDelivery(s)!;
    const snap = scoringUiSnapshotFromEngineState(undone, ctx);
    expect(snap.phase).toBe("scoring");
    expect(snap.striker?.name).toBe("Batter A");
    expect(snap.nonStriker?.name).toBe("Batter B");
    expect(undone.batters[participantKey(B, "Batter B")]!.isOut).toBe(false);
  });

  it("wide undo restores prior totals", () => {
    let s = createEmptyInningsState(20);
    s = applyDeliveryToState(s, buildNormalRunDelivery(s, P, uuid(1), 4));
    s = applyDeliveryToState(s, buildWideDelivery(s, P, uuid(2), 1));
    const undone = undoLastDelivery(s)!;
    expect(undone.totalRuns).toBe(4);
    expect(scoringUiSnapshotFromEngineState(undone, ctx).phase).toBe("scoring");
  });

  it("final ball of over undo returns to mid-over scoring", () => {
    let s = createEmptyInningsState(20);
    for (let i = 0; i < 5; i += 1) {
      s = applyDeliveryToState(
        s,
        buildNormalRunDelivery(s, P, uuid(10 + i), 0),
      );
    }
    s = applyDeliveryToState(s, buildNormalRunDelivery(s, P, uuid(20), 1));
    expect(deriveScoringPhase(s, ctx)).toBe("need_bowler");
    const undone = undoLastDelivery(s)!;
    expect(undone.legalBalls).toBe(5);
    expect(scoringUiSnapshotFromEngineState(undone, ctx).phase).toBe("scoring");
  });

  it("repeated undos do not corrupt crease", () => {
    let s = createEmptyInningsState(20);
    for (let i = 0; i < 3; i += 1) {
      s = applyDeliveryToState(
        s,
        buildNormalRunDelivery(s, P, uuid(i + 1), 1),
      );
    }
    s = undoLastDelivery(s)!;
    s = undoLastDelivery(s)!;
    expect(s.deliveries.length).toBe(1);
    expect(activeBattersAtCrease(s)).toBe(2);
    expect(scoringUiSnapshotFromEngineState(s, ctx).phase).toBe("scoring");
  });
});
