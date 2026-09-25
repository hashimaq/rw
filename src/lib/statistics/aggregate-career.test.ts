import { describe, expect, it } from "vitest";
import {
  applyDeliveryToState,
  createEmptyInningsState,
} from "@/lib/scoring-engine/build-state";
import {
  buildNormalRunDelivery,
  type ActiveParticipants,
} from "@/lib/scoring-engine/delivery-builders";
import type { Delivery, InningsRow } from "@/lib/database/types";
import { deliveriesByInningsFromRows } from "@/lib/scorecard/persisted-scorecard-assembler";
import { aggregateCareerStatistics } from "@/lib/statistics/aggregate-career";
import { dedupeDeliveriesForStatistics } from "@/lib/statistics/dedupe-deliveries";

const RW = "11111111-1111-4111-8111-111111111111";
const RW2 = "22222222-2222-4222-8222-222222222222";

function deliveryRowFromInput(
  inningsId: string,
  seq: number,
  d: ReturnType<typeof buildNormalRunDelivery>,
): Delivery {
  return {
    id: `d-${seq}`,
    innings_id: inningsId,
    client_event_id: d.clientEventId,
    sequence_in_innings: seq,
    over_number: d.overNumber,
    ball_number: d.ballNumber,
    striker_player_id: d.strikerPlayerId,
    striker_name: d.strikerName,
    non_striker_player_id: d.nonStrikerPlayerId,
    non_striker_name: d.nonStrikerName,
    bowler_player_id: d.bowlerPlayerId,
    bowler_name: d.bowlerName,
    batter_runs: d.batterRuns,
    total_runs: d.totalRuns,
    extras_runs: d.extrasRuns,
    extra_type: d.extraType,
    is_legal_delivery: d.isLegalDelivery,
    is_boundary: d.isBoundary,
    is_six: d.isSix,
    is_wicket: d.isWicket,
    wicket_type: d.wicketType,
    dismissed_player_id: d.dismissedPlayerId,
    dismissed_player_name: d.dismissedPlayerName,
    fielder_player_id: d.fielderPlayerId,
    fielder_name: d.fielderName,
    notes: d.notes ?? null,
    created_at: "2026-01-01T00:00:00Z",
  };
}

describe("aggregateCareerStatistics", () => {
  it("accumulates batting from completed innings deliveries", () => {
    const inn2Id = "inn-2";
    const innings: InningsRow[] = [
      {
        id: inn2Id,
        match_id: "match-1",
        innings_number: 2,
        batting_team: "red_wings",
        bowling_team: "opponent",
        innings_status: "completed",
        target: 22,
        overs_limit: 20,
        total_runs: 23,
        wickets: 0,
        completed_at: null,
        created_at: "2026-01-01T00:00:00Z",
      },
    ];

    let s = createEmptyInningsState(20);
    const chaseP: ActiveParticipants = {
      strikerPlayerId: RW,
      strikerName: "Hashim",
      nonStrikerPlayerId: RW2,
      nonStrikerName: "Abdul",
      bowlerPlayerId: null,
      bowlerName: "Opp",
    };
    const d1 = buildNormalRunDelivery(s, chaseP, "c1", 4);
    s = applyDeliveryToState(s, d1);
    const d2 = buildNormalRunDelivery(s, chaseP, "c2", 19);
    s = applyDeliveryToState(s, d2);

    const deliveryRows = [
      deliveryRowFromInput(inn2Id, 1, d1),
      deliveryRowFromInput(inn2Id, 2, d2),
    ];
    const deliveriesByInningsId = deliveriesByInningsFromRows(innings, deliveryRows);

    const snapshot = aggregateCareerStatistics([
      {
        matchId: "match-1",
        shareSlug: "khora-test",
        matchNumber: "Match #1",
        opponentName: "Khora",
        matchDate: "2026-03-01",
        completedAt: "2026-03-01T00:00:00Z",
        oversLimit: 20,
        winner: "red_wings",
        result: "red_wings_win",
        innings,
        deliveriesByInningsId,
        squad: [
          {
            playerId: RW,
            squadStatus: "playing_xi",
            isCaptain: true,
          },
          {
            playerId: RW2,
            squadStatus: "playing_xi",
            isCaptain: false,
          },
        ],
      },
    ]);

    const hashim = snapshot.statsByPlayerId[RW];
    expect(hashim?.runs).toBe(23);
    expect(hashim?.matches).toBe(1);
    expect(hashim?.wins).toBe(1);
    expect(hashim?.highestScore).toBe(23);
    expect(hashim?.average).toBeNull();
    expect(snapshot.recentByPlayerId[RW]?.length).toBeGreaterThan(0);
  });

  it("dedupes duplicate client event ids before replay", () => {
    const innId = "inn-1";
    const innings: InningsRow[] = [
      {
        id: innId,
        match_id: "m",
        innings_number: 1,
        batting_team: "red_wings",
        bowling_team: "opponent",
        innings_status: "completed",
        target: null,
        overs_limit: 20,
        total_runs: 4,
        wickets: 0,
        completed_at: null,
        created_at: "2026-01-01T00:00:00Z",
      },
    ];
    const s = createEmptyInningsState(20);
    const p: ActiveParticipants = {
      strikerPlayerId: RW,
      strikerName: "A",
      nonStrikerPlayerId: RW2,
      nonStrikerName: "B",
      bowlerPlayerId: null,
      bowlerName: "O",
    };
    const d = buildNormalRunDelivery(s, p, "same-id", 4);
    const row = deliveryRowFromInput(innId, 1, d);
    const dup = { ...row, id: "d-2" };
    const inputs = deliveriesByInningsFromRows(innings, [row, dup]).get(innId)!;
    expect(dedupeDeliveriesForStatistics(inputs)).toHaveLength(1);
  });
});
