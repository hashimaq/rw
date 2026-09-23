import { describe, expect, it } from "vitest";
import { mergeDeliveries } from "@/lib/scoring/merge-deliveries";
import {
  emptySecondInningsState,
  planStartSecondInnings,
  secondInningsInfoFromApi,
  secondInningsScoringSnapshot,
  serverDeliveriesForHydration,
} from "@/lib/scoring/second-innings-transition";
import { buildNormalRunDelivery } from "@/lib/scoring-engine/delivery-builders";
import {
  applyDeliveryToState,
  buildInningsStateFromDeliveries,
} from "@/lib/scoring-engine/build-state";
import type { ActiveParticipants } from "@/lib/scoring-engine/delivery-builders";
import { liveSummary } from "@/lib/scoring-engine/build-state";

const P: ActiveParticipants = {
  strikerPlayerId: "11111111-1111-4111-8111-111111111111",
  strikerName: "A",
  nonStrikerPlayerId: "22222222-2222-4222-8222-222222222222",
  nonStrikerName: "B",
  bowlerPlayerId: "33333333-3333-4333-8333-333333333333",
  bowlerName: "X",
};

describe("second innings transition", () => {
  it("does not hydrate stale first-innings server deliveries into innings 2", () => {
    const firstInningsId = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
    const secondInningsId = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";
    let firstState = emptySecondInningsState(20, null);
    firstState = applyDeliveryToState(
      firstState,
      buildNormalRunDelivery(firstState, P, "d1", 120),
    );
    const staleFirstDeliveries = firstState.deliveries;

    const serverForSecond = serverDeliveriesForHydration(
      {
        activeInningsId: firstInningsId,
        deliveries: staleFirstDeliveries,
      },
      secondInningsId,
    );
    expect(serverForSecond).toEqual([]);

    const merged = mergeDeliveries(serverForSecond, []);
    const rebuilt = buildInningsStateFromDeliveries(merged, 20, 121);
    expect(rebuilt.totalRuns).toBe(0);
    expect(rebuilt.wickets).toBe(0);
    expect(rebuilt.target).toBe(121);
  });

  it("second innings snapshot starts at setup_openers with chase target", () => {
    const state = emptySecondInningsState(20, 151);
    const snap = secondInningsScoringSnapshot(state, 2, "not_started");
    expect(snap.phase).toBe("setup_openers");
    expect(snap.striker).toBeNull();
    expect(snap.nonStriker).toBeNull();
    expect(snap.wicketReplacementSlot).toBeNull();

    const summary = liveSummary(state);
    expect(summary.totalRuns).toBe(0);
    expect(summary.wickets).toBe(0);
    expect(summary.target).toBe(151);
    expect(summary.runsRequired).toBe(151);
    expect(summary.crr).toBeNull();
    expect(summary.requiredRunRate).not.toBeNull();
    expect(Number.isFinite(summary.requiredRunRate!)).toBe(true);
  });

  it("builds innings list entry with swapped batting side", () => {
    const info = secondInningsInfoFromApi(
      {
        id: "i2",
        overs_limit: 20,
        target: 101,
        batting_team: "opponent",
        bowling_team: "red_wings",
        innings_status: "not_started",
      },
      {
        id: "i1",
        inningsNumber: 1,
        battingTeam: "red_wings",
        bowlingTeam: "opponent",
        inningsStatus: "completed",
        target: null,
        oversLimit: 20,
        totalRuns: 100,
        wickets: 3,
      },
    );
    expect(info.inningsNumber).toBe(2);
    expect(info.battingTeam).toBe("opponent");
    expect(info.target).toBe(101);
  });

  it("planStartSecondInnings creates when first innings completed", () => {
    const plan = planStartSecondInnings([
      {
        id: "i1",
        innings_number: 1,
        innings_status: "completed",
        total_runs: 88,
        overs_limit: 20,
        batting_team: "red_wings",
        bowling_team: "opponent",
        target: null,
      },
    ]);
    expect(plan.kind).toBe("create");
    if (plan.kind === "create") {
      expect(plan.target).toBe(89);
      expect(plan.battingTeam).toBe("opponent");
    }
  });

  it("planStartSecondInnings returns existing second innings (idempotent)", () => {
    const second = {
      id: "i2",
      innings_number: 2,
      innings_status: "not_started",
      total_runs: 0,
      overs_limit: 20,
      batting_team: "opponent" as const,
      bowling_team: "red_wings" as const,
      target: 89,
    };
    const plan = planStartSecondInnings([
      {
        id: "i1",
        innings_number: 1,
        innings_status: "completed",
        total_runs: 88,
        overs_limit: 20,
        batting_team: "red_wings",
        bowling_team: "opponent",
        target: null,
      },
      second,
    ]);
    expect(plan).toEqual({ kind: "existing", innings: second });
  });

  it("planStartSecondInnings rejects incomplete first innings", () => {
    const plan = planStartSecondInnings([
      {
        id: "i1",
        innings_number: 1,
        innings_status: "in_progress",
        total_runs: 40,
        overs_limit: 20,
        batting_team: "red_wings",
        bowling_team: "opponent",
        target: null,
      },
    ]);
    expect(plan.kind).toBe("error");
  });
});
