import { describe, expect, it } from "vitest";
import {
  buildScorecardBattingFigures,
  SCORECARD_BATTING_XI_SIZE,
} from "@/lib/scorecard/scorecard-batting-xi";
import type { ScorecardSquadMember } from "@/lib/scorecard/build-scorecard";
import {
  applyDeliveryToState,
  createEmptyInningsState,
} from "@/lib/scoring-engine/build-state";
import {
  buildNormalRunDelivery,
  type ActiveParticipants,
} from "@/lib/scoring-engine/delivery-builders";
import type { InningsRow } from "@/lib/database/types";

const RW = "11111111-1111-4111-8111-111111111111";
const RW2 = "22222222-2222-4222-8222-222222222222";

function squadMember(
  id: string,
  name: string,
  order: number,
): ScorecardSquadMember {
  return {
    playerId: id,
    fullName: name,
    jerseyNumber: order,
    isCaptain: order === 1,
    isWicketkeeper: order === 2,
    squadStatus: "playing_xi",
    isGuest: false,
    battingPosition: order,
    squadOrder: order - 1,
  };
}

function makeSquadEleven(): ScorecardSquadMember[] {
  const ids = [
    RW,
    RW2,
    "33333333-3333-4333-8333-333333333333",
    "44444444-4444-4444-8444-444444444444",
    "55555555-5555-4555-8555-555555555555",
    "66666666-6666-4666-8666-666666666666",
    "77777777-7777-4777-8777-777777777777",
    "88888888-8888-4888-8888-888888888888",
    "99999999-9999-4999-8999-999999999999",
    "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
    "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb",
  ];
  return ids.map((id, i) => squadMember(id, `Player ${i + 1}`, i + 1));
}

function inningsRow(id: string): InningsRow {
  return {
    id,
    match_id: "m1",
    innings_number: 1,
    batting_team: "red_wings",
    bowling_team: "opponent",
    innings_status: "completed",
    target: null,
    overs_limit: 20,
    total_runs: 0,
    wickets: 0,
    completed_at: null,
    created_at: "2026-01-01T00:00:00Z",
  };
}

describe("buildScorecardBattingFigures", () => {
  it("returns exactly 11 rows with Did not bat for unused XI slots", () => {
    const squad = makeSquadEleven();
    let state = createEmptyInningsState(20);
    const P: ActiveParticipants = {
      strikerPlayerId: RW,
      strikerName: "Player 1",
      nonStrikerPlayerId: RW2,
      nonStrikerName: "Player 2",
      bowlerPlayerId: null,
      bowlerName: "Opp",
    };
    state = applyDeliveryToState(
      state,
      buildNormalRunDelivery(state, P, "d1", 4),
    );

    const row = inningsRow("inn-1");
    const figures = buildScorecardBattingFigures(
      state,
      row,
      squad,
      new Set(),
      [row],
      new Map([["inn-1", []]]),
    );

    expect(figures).toHaveLength(SCORECARD_BATTING_XI_SIZE);
    expect(figures.filter((f) => f.didNotBat).length).toBe(9);
    expect(figures.find((f) => f.name.startsWith("Player 1"))?.runs).toBe(4);
    expect(figures.find((f) => f.didNotBat)?.dismissal).toBeNull();
  });
});
