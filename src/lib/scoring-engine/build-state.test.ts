import { describe, expect, it } from "vitest";
import {
  applyDeliveryToState,
  buildInningsStateFromDeliveries,
  createEmptyInningsState,
  undoLastDelivery,
} from "./build-state";
import {
  buildByeDelivery,
  buildLegByeDelivery,
  buildNormalRunDelivery,
  buildNoBallDelivery,
  buildWideDelivery,
  buildWicketDelivery,
  type ActiveParticipants,
} from "./delivery-builders";
import { participantKey } from "./utils";

const P: ActiveParticipants = {
  strikerPlayerId: "11111111-1111-1111-1111-111111111111",
  strikerName: "Striker",
  nonStrikerPlayerId: "22222222-2222-2222-2222-222222222222",
  nonStrikerName: "NonStriker",
  bowlerPlayerId: "33333333-3333-3333-3333-333333333333",
  bowlerName: "Bowler",
};

function uuid(n: number) {
  return `${String(n).padStart(8, "0")}-0000-4000-8000-000000000001`;
}

describe("scoring engine", () => {
  it("scores normal runs and rotates strike on odd runs", () => {
    let s = createEmptyInningsState(20);
    s = applyDeliveryToState(
      s,
      buildNormalRunDelivery(s, P, uuid(1), 1),
    );
    expect(s.totalRuns).toBe(1);
    expect(s.strikerKey).toBe(
      participantKey(P.nonStrikerPlayerId, P.nonStrikerName),
    );
    s = applyDeliveryToState(s, buildNormalRunDelivery(s, P, uuid(2), 4));
    expect(s.batters[participantKey(P.strikerPlayerId, P.strikerName)].fours).toBe(
      1,
    );
  });

  it("wide does not count as legal ball", () => {
    let s = createEmptyInningsState(20);
    s = applyDeliveryToState(s, buildWideDelivery(s, P, uuid(1), 0));
    expect(s.totalRuns).toBe(1);
    expect(s.legalBalls).toBe(0);
    expect(s.extrasBreakdown.wides).toBe(1);
    expect(
      s.bowlers[participantKey(P.bowlerPlayerId, P.bowlerName)]!.widesBowled,
    ).toBe(1);
    expect(s.batters[participantKey(P.strikerPlayerId, P.strikerName)].runs).toBe(
      0,
    );
    expect(
      s.batters[participantKey(P.strikerPlayerId, P.strikerName)].balls,
    ).toBe(0);
  });

  it("bye does not add to batter or bowler", () => {
    let s = createEmptyInningsState(20);
    s = applyDeliveryToState(s, buildByeDelivery(s, P, uuid(1), 2));
    expect(s.totalRuns).toBe(2);
    expect(s.batters[participantKey(P.strikerPlayerId, P.strikerName)].runs).toBe(
      0,
    );
    expect(
      s.bowlers[participantKey(P.bowlerPlayerId, P.bowlerName)].runsConceded,
    ).toBe(0);
    expect(s.legalBalls).toBe(1);
  });

  it("no-ball adds extra and batter runs", () => {
    let s = createEmptyInningsState(20);
    s = applyDeliveryToState(
      s,
      buildNoBallDelivery(s, P, uuid(1), { kind: "bat", additionalRuns: 4 }),
    );
    expect(s.totalRuns).toBe(5);
    expect(s.legalBalls).toBe(0);
    expect(s.batters[participantKey(P.strikerPlayerId, P.strikerName)].runs).toBe(
      4,
    );
    expect(
      s.bowlers[participantKey(P.bowlerPlayerId, P.bowlerName)].runsConceded,
    ).toBe(5);
    expect(
      s.bowlers[participantKey(P.bowlerPlayerId, P.bowlerName)]!.noBallsBowled,
    ).toBe(1);
    expect(s.extrasBreakdown.noBalls).toBe(1);
    expect(
      s.batters[participantKey(P.strikerPlayerId, P.strikerName)].balls,
    ).toBe(1);
  });

  it("undo restores prior state", () => {
    let s = createEmptyInningsState(20);
    s = applyDeliveryToState(s, buildNormalRunDelivery(s, P, uuid(1), 4));
    s = applyDeliveryToState(s, buildNormalRunDelivery(s, P, uuid(2), 2));
    const undone = undoLastDelivery(s);
    expect(undone?.totalRuns).toBe(4);
    expect(undone?.deliveries.length).toBe(1);
  });

  it("wicket increments wickets and records FOW", () => {
    let s = createEmptyInningsState(20);
    const w = buildWicketDelivery(s, P, uuid(1), {
      wicketType: "bowled",
      dismissedPlayerId: P.strikerPlayerId,
      dismissedPlayerName: P.strikerName,
    });
    s = applyDeliveryToState(s, w);
    expect(s.wickets).toBe(1);
    expect(s.fallOfWickets.length).toBe(1);
    expect(
      s.bowlers[participantKey(P.bowlerPlayerId, P.bowlerName)].wickets,
    ).toBe(1);
  });

  it("rotates strike at end of over after even runs", () => {
    let s = createEmptyInningsState(20);
    for (let i = 0; i < 5; i += 1) {
      s = applyDeliveryToState(
        s,
        buildNormalRunDelivery(s, P, uuid(10 + i), 0),
      );
    }
    const beforeStriker = s.strikerKey;
    s = applyDeliveryToState(s, buildNormalRunDelivery(s, P, uuid(20), 2));
    expect(s.legalBalls).toBe(6);
    expect(s.strikerKey).not.toBe(beforeStriker);
  });

  it("builds consistent state from delivery list", () => {
    let s = createEmptyInningsState(20);
    const d1 = buildNormalRunDelivery(s, P, uuid(1), 0);
    s = applyDeliveryToState(s, d1);
    const d2 = buildLegByeDelivery(s, P, uuid(2), 1);
    const rebuilt = buildInningsStateFromDeliveries([d1, d2], 20);
    expect(rebuilt.totalRuns).toBe(1);
  });
});
