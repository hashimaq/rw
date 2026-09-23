import { describe, expect, it } from "vitest";
import {
  applyDeliveryToState,
  createEmptyInningsState,
} from "@/lib/scoring-engine/build-state";
import {
  buildNormalRunDelivery,
  type ActiveParticipants,
} from "@/lib/scoring-engine/delivery-builders";
import type { Delivery, InningsRow, Match } from "@/lib/database/types";
import { buildScorecardFromPersistedRows } from "@/lib/scorecard/persisted-scorecard-assembler";

const RW = "11111111-1111-4111-8111-111111111111";
const RW2 = "22222222-2222-4222-8222-222222222222";

function baseMatch(): Match {
  return {
    id: "match-1",
    match_number: "Match #1",
    opponent_name: "Khora",
    match_date: "2026-03-01",
    venue: "Ground",
    overs_limit: 20,
    custom_overs_note: null,
    status: "completed",
    series_id: null,
    tournament_id: null,
    toss_winner: "opponent",
    toss_decision: "bat",
    red_wings_batting_first: false,
    result: "red_wings_win",
    winner: "red_wings",
    win_margin: 9,
    win_margin_type: "wickets",
    scorer_pin_hash: "x",
    is_public_live: true,
    is_public_scorecard: true,
    share_slug: "khora-test",
    player_of_match_id: null,
    created_by: null,
    created_at: "2026-01-01T00:00:00Z",
    updated_at: "2026-01-01T00:00:00Z",
    started_at: null,
    completed_at: "2026-03-01T00:00:00Z",
  };
}

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

describe("completed scorecard from persisted rows", () => {
  it("renders batting stats and totals from deliveries (not 0/0 DNB)", () => {
    const inn1Id = "inn-1";
    const inn2Id = "inn-2";
    const innings: InningsRow[] = [
      {
        id: inn1Id,
        match_id: "match-1",
        innings_number: 1,
        batting_team: "opponent",
        bowling_team: "red_wings",
        innings_status: "completed",
        target: null,
        overs_limit: 20,
        total_runs: 21,
        wickets: 0,
        completed_at: null,
        created_at: "2026-01-01T00:00:00Z",
      },
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
        wickets: 1,
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

    const data = buildScorecardFromPersistedRows({
      match: {
        ...baseMatch(),
        series: null,
        tournament: null,
        player_of_match: null,
      },
      innings,
      squadRows: [
        {
          player_id: RW,
          squad_status: "playing_xi",
          is_captain: true,
          is_wicketkeeper: false,
          batting_position: 1,
          created_at: "2026-01-01T00:00:00Z",
        },
        {
          player_id: RW2,
          squad_status: "playing_xi",
          is_captain: false,
          is_wicketkeeper: false,
          batting_position: 2,
          created_at: "2026-01-01T00:00:00Z",
        },
      ],
      deliveryRows,
      players: [
        {
          id: RW,
          full_name: "Hashim",
          jersey_number: 1,
          is_official_squad: true,
        },
        {
          id: RW2,
          full_name: "Abdul",
          jersey_number: 2,
          is_official_squad: true,
        },
      ],
    });

    const inn2 = data.innings.find((i) => i.inningsNumber === 2)!;
    expect(inn2.innings.totalRuns).toBe(23);
    expect(inn2.innings.wickets).toBe(0);
    const hashim = inn2.innings.battingFigures.find((b) =>
      b.name.startsWith("Hashim"),
    );
    expect(hashim?.didNotBat).toBe(false);
    expect(hashim?.runs).toBe(23);
    expect(hashim?.balls).toBeGreaterThan(0);
    expect(data.document.resultSummary).toBe("Red Wings won by 9 wickets");
  });
});
