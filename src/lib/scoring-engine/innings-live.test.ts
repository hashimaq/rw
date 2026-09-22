import { describe, expect, it } from "vitest";
import {
  applyDeliveryToState,
  buildInningsStateFromDeliveries,
  createEmptyInningsState,
  liveSummary,
} from "./build-state";
import {
  buildByeDelivery,
  buildLegByeDelivery,
  buildNormalRunDelivery,
  buildNoBallDelivery,
  buildWideDelivery,
  type ActiveParticipants,
} from "./delivery-builders";
import {
  chaseBallsRemaining,
  chaseRunsNeeded,
  formatCurrentRunRate,
  formatRequiredRunRate,
  isChaseInnings,
  isChaseTargetReached,
  topBatters,
  topBowlers,
} from "./innings-live";

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

describe("innings live rates and chase", () => {
  it("first innings shows CRR and not chase fields", () => {
    let s = createEmptyInningsState(20);
    s = applyDeliveryToState(s, buildNormalRunDelivery(s, P, uuid(1), 4));
    const summary = liveSummary(s);
    expect(summary.isChaseInnings).toBe(false);
    expect(summary.target).toBeNull();
    expect(summary.runsRequired).toBeNull();
    expect(summary.crr).not.toBeNull();
    expect(formatCurrentRunRate(s.totalRuns, s.legalBalls)).toBe("24.00");
  });

  it("second innings derives chase from target on state", () => {
    const s = createEmptyInningsState(20, 143);
    expect(isChaseInnings(s)).toBe(true);
    const summary = liveSummary(s);
    expect(summary.isChaseInnings).toBe(true);
    expect(summary.target).toBe(143);
    expect(summary.runsRequired).toBe(143);
    expect(summary.ballsRemaining).toBe(120);
    expect(formatCurrentRunRate(0, 0)).toBe("—");
    expect(summary.crr).toBeNull();
  });

  it("target is first innings total plus one via chase state", () => {
    const chase = createEmptyInningsState(20, 142 + 1);
    expect(chase.target).toBe(143);
  });

  it("CRR after 43 runs in 36 legal balls", () => {
    expect(formatCurrentRunRate(43, 36)).toBe("7.17");
  });

  it("RRR for 91 needed off 78 balls", () => {
    expect(formatRequiredRunRate(91, 78)).toBe("7.00");
  });

  it("CRR and RRR update after a delivery", () => {
    let s = createEmptyInningsState(20, 143);
    const before = liveSummary(s);
    s = applyDeliveryToState(s, buildNormalRunDelivery(s, P, uuid(1), 2));
    const after = liveSummary(s);
    expect(after.totalRuns).toBe(2);
    expect(after.runsRequired).toBe(141);
    expect(after.ballsRemaining).toBe(119);
    expect(after.crr).toBe(12);
    expect(before.crr).toBeNull();
    expect(after.requiredRunRate).toBeCloseTo(7.11, 1);
  });

  it("wide does not consume a legal ball for balls remaining", () => {
    let s = createEmptyInningsState(20, 143);
    s = applyDeliveryToState(s, buildWideDelivery(s, P, uuid(1), 0));
    expect(s.legalBalls).toBe(0);
    expect(chaseBallsRemaining(s)).toBe(120);
    expect(chaseRunsNeeded(s)).toBe(142);
  });

  it("no-ball does not consume a legal ball", () => {
    let s = createEmptyInningsState(20, 143);
    s = applyDeliveryToState(s, buildNoBallDelivery(s, P, uuid(1), 0));
    expect(s.legalBalls).toBe(0);
    expect(chaseBallsRemaining(s)).toBe(120);
  });

  it("bye consumes a legal ball", () => {
    let s = createEmptyInningsState(20, 143);
    s = applyDeliveryToState(s, buildByeDelivery(s, P, uuid(1), 1));
    expect(s.legalBalls).toBe(1);
    expect(chaseBallsRemaining(s)).toBe(119);
  });

  it("leg bye consumes a legal ball", () => {
    let s = createEmptyInningsState(20, 143);
    s = applyDeliveryToState(s, buildLegByeDelivery(s, P, uuid(1), 1));
    expect(s.legalBalls).toBe(1);
  });

  it("wide chase: need decreases but balls remain", () => {
    let s = createEmptyInningsState(20, 25);
    for (let i = 0; i < 6; i += 1) {
      s = applyDeliveryToState(
        s,
        buildNormalRunDelivery(s, P, uuid(100 + i), 1),
      );
    }
    expect(chaseRunsNeeded(s)).toBe(19);
    expect(chaseBallsRemaining(s)).toBe(114);
    s = applyDeliveryToState(s, buildWideDelivery(s, P, uuid(999), 0));
    expect(chaseRunsNeeded(s)).toBe(18);
    expect(chaseBallsRemaining(s)).toBe(114);
    expect(s.legalBalls).toBe(6);
  });

  it("legal delivery reduces balls remaining", () => {
    let s = createEmptyInningsState(20, 25);
    for (let i = 0; i < 6; i += 1) {
      s = applyDeliveryToState(
        s,
        buildNormalRunDelivery(s, P, uuid(200 + i), 1),
      );
    }
    expect(chaseBallsRemaining(s)).toBe(114);
    s = applyDeliveryToState(s, buildNormalRunDelivery(s, P, uuid(300), 2));
    expect(chaseRunsNeeded(s)).toBe(17);
    expect(chaseBallsRemaining(s)).toBe(113);
  });

  it("zero legal balls does not produce invalid CRR", () => {
    expect(formatCurrentRunRate(0, 0)).toBe("—");
    expect(formatCurrentRunRate(10, 0)).toBe("—");
  });

  it("zero balls remaining does not produce Infinity RRR display", () => {
    expect(formatRequiredRunRate(5, 0)).toBeNull();
    expect(formatRequiredRunRate(0, 0)).toBe("0.00");
  });

  it("runs needed never negative when target reached", () => {
    let s = createEmptyInningsState(20, 10);
    s = applyDeliveryToState(s, buildNormalRunDelivery(s, P, uuid(1), 6));
    s = applyDeliveryToState(s, buildNormalRunDelivery(s, P, uuid(2), 4));
    const summary = liveSummary(s);
    expect(summary.runsRequired).toBe(0);
    expect(summary.chaseComplete).toBe(true);
    expect(isChaseTargetReached(s)).toBe(true);
  });

  it("top batters and bowlers rank deterministically", () => {
    let s = createEmptyInningsState(20);
    s = applyDeliveryToState(s, buildNormalRunDelivery(s, P, uuid(1), 4));
    s = applyDeliveryToState(s, buildNormalRunDelivery(s, P, uuid(2), 6));
    const batters = topBatters(s);
    expect(batters.length).toBeGreaterThan(0);
    expect(batters[0].runs).toBeGreaterThanOrEqual(batters[1]?.runs ?? 0);
    const bowlers = topBowlers(s);
    expect(bowlers.length).toBe(1);
    expect(bowlers[0].wickets).toBe(0);
  });

  it("guest batter key still aggregates in top batters", () => {
    const guestId = "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa";
    const guestP: ActiveParticipants = {
      ...P,
      strikerPlayerId: guestId,
      strikerName: "Guest Batter",
    };
    let s = createEmptyInningsState(20);
    s = applyDeliveryToState(
      s,
      buildNormalRunDelivery(s, guestP, uuid(1), 4),
    );
    const batters = topBatters(s);
    expect(batters.some((b) => b.name === "Guest Batter" && b.runs === 4)).toBe(
      true,
    );
  });

  it("rebuild from deliveries matches live summary", () => {
    let s = createEmptyInningsState(20, 100);
    const d1 = buildNormalRunDelivery(s, P, uuid(1), 1);
    s = applyDeliveryToState(s, d1);
    const rebuilt = buildInningsStateFromDeliveries([d1], 20, 100);
    expect(liveSummary(rebuilt).runsRequired).toBe(99);
  });
});
