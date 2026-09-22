import { describe, expect, it } from "vitest";
import {
  applyDeliveryToState,
  buildInningsStateFromDeliveries,
  createEmptyInningsState,
} from "@/lib/scoring-engine/build-state";
import {
  buildNormalRunDelivery,
  buildWicketDelivery,
  type ActiveParticipants,
} from "@/lib/scoring-engine/delivery-builders";
import type { DeliveryInput } from "@/lib/scoring-engine/types";
import type { InningsRow, Match } from "@/lib/database/types";
import { buildFullMatchScorecard } from "@/lib/scorecard/build-scorecard";
import { groupDeliveriesByOver } from "@/lib/scorecard/group-deliveries-by-over";
import { formatDeliveryLabel } from "@/lib/scoring-engine/format-ball";

const RW = "11111111-1111-4111-8111-111111111111";
const RW2 = "22222222-2222-4222-8222-222222222222";
const RW3 = "33333333-3333-4333-8333-333333333333";
const GUEST = "44444444-4444-4444-8444-444444444444";

const P: ActiveParticipants = {
  strikerPlayerId: RW,
  strikerName: "Hashim",
  nonStrikerPlayerId: RW2,
  nonStrikerName: "Abdul Rehman",
  bowlerPlayerId: RW3,
  bowlerName: "Mujahid",
};

function uuid(n: number) {
  return `${String(n).padStart(8, "0")}-0000-4000-8000-000000000001`;
}

function baseMatch(overrides: Partial<Match> = {}): Match {
  return {
    id: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
    match_number: "Match #1",
    opponent_name: "ABC Club",
    match_date: "2026-03-01",
    venue: "Main Ground",
    overs_limit: 20,
    custom_overs_note: null,
    status: "completed",
    series_id: null,
    tournament_id: null,
    toss_winner: "red_wings",
    toss_decision: "bat",
    red_wings_batting_first: true,
    result: "red_wings_win",
    winner: "red_wings",
    win_margin: 23,
    win_margin_type: "runs",
    scorer_pin_hash: "hash",
    is_public_live: true,
    is_public_scorecard: true,
    share_slug: "abc123",
    player_of_match_id: null,
    created_by: null,
    created_at: "2026-01-01T00:00:00Z",
    updated_at: "2026-01-01T00:00:00Z",
    started_at: null,
    completed_at: "2026-03-01T18:00:00Z",
    ...overrides,
  };
}

function inningsRow(
  overrides: Partial<InningsRow> &
    Pick<InningsRow, "id" | "innings_number" | "batting_team" | "bowling_team">,
): InningsRow {
  return {
    match_id: baseMatch().id,
    innings_status: "completed",
    target: null,
    overs_limit: 20,
    total_runs: 0,
    wickets: 0,
    completed_at: null,
    created_at: "2026-01-01T00:00:00Z",
    ...overrides,
  };
}

function singleInningsDeliveries(): DeliveryInput[] {
  let s = createEmptyInningsState(20);
  const list: DeliveryInput[] = [];
  const d1 = buildNormalRunDelivery(s, P, uuid(1), 4);
  s = applyDeliveryToState(s, d1);
  list.push(d1);
  const d2 = buildWicketDelivery(s, P, uuid(2), {
    wicketType: "bowled",
    dismissedPlayerId: P.strikerPlayerId,
    dismissedPlayerName: P.strikerName,
  });
  list.push(d2);
  return list;
}

function buildTwoInnings(
  firstBatting: "red_wings" | "opponent",
  secondBatting: "red_wings" | "opponent",
) {
  const inn1Id = "11111111-1111-4111-8111-111111111101";
  const inn2Id = "11111111-1111-4111-8111-111111111102";
  const d1 = singleInningsDeliveries();
  return buildFullMatchScorecard({
    match: baseMatch(),
    seriesName: "League",
    tournamentName: "Cup",
    playerOfMatchId: null,
    playerOfMatchName: null,
    squad: [
      {
        playerId: GUEST,
        fullName: "Guest Player",
        jerseyNumber: null,
        isCaptain: false,
        isWicketkeeper: false,
        squadStatus: "playing_xi",
        isGuest: true,
        battingPosition: 1,
        squadOrder: 0,
      },
    ],
    innings: [
      inningsRow({
        id: inn1Id,
        innings_number: 1,
        batting_team: firstBatting,
        bowling_team: firstBatting === "red_wings" ? "opponent" : "red_wings",
      }),
      inningsRow({
        id: inn2Id,
        innings_number: 2,
        batting_team: secondBatting,
        bowling_team: secondBatting === "red_wings" ? "opponent" : "red_wings",
        target: 50,
      }),
    ],
    deliveriesByInningsId: new Map([
      [inn1Id, d1],
      [inn2Id, []],
    ]),
  });
}

describe("full match scorecard UI data", () => {
  it("renders one innings in the DTO", () => {
    const innId = "inn-one";
    const built = buildFullMatchScorecard({
      match: baseMatch(),
      seriesName: null,
      tournamentName: null,
      playerOfMatchId: null,
    playerOfMatchName: null,
      squad: [],
      innings: [
        inningsRow({
          id: innId,
          innings_number: 1,
          batting_team: "red_wings",
          bowling_team: "opponent",
        }),
      ],
      deliveriesByInningsId: new Map([[innId, singleInningsDeliveries()]]),
    });
    expect(built.innings).toHaveLength(1);
    expect(built.document.innings).toHaveLength(1);
  });

  it("renders two innings", () => {
    const data = buildTwoInnings("red_wings", "opponent");
    expect(data.innings).toHaveLength(2);
    expect(data.document.innings).toHaveLength(2);
  });

  it("Red Wings batting first", () => {
    const data = buildTwoInnings("red_wings", "opponent");
    expect(data.innings[0]!.battingTeam).toBe("red_wings");
  });

  it("Red Wings bowling first (opponent bats first)", () => {
    const data = buildTwoInnings("opponent", "red_wings");
    expect(data.innings[0]!.battingTeam).toBe("opponent");
    expect(data.innings[1]!.battingTeam).toBe("red_wings");
  });

  it("Red Wings batting second (chase)", () => {
    const data = buildTwoInnings("opponent", "red_wings");
    expect(data.innings[1]!.target).toBe(50);
    expect(data.innings[1]!.battingTeam).toBe("red_wings");
  });

  it("opponent chasing second innings", () => {
    const data = buildTwoInnings("red_wings", "opponent");
    expect(data.innings[1]!.battingTeam).toBe("opponent");
    expect(data.innings[1]!.target).toBe(50);
  });

  it("shows persisted result summary", () => {
    const data = buildTwoInnings("red_wings", "opponent");
    expect(data.document.resultSummary).toBe("Red Wings won by 23 runs");
  });

  it("includes extras breakdown", () => {
    const innId = "inn-extras";
    const built = buildFullMatchScorecard({
      match: baseMatch(),
      seriesName: null,
      tournamentName: null,
      playerOfMatchId: null,
    playerOfMatchName: null,
      squad: [],
      innings: [
        inningsRow({
          id: innId,
          innings_number: 1,
          batting_team: "red_wings",
          bowling_team: "opponent",
        }),
      ],
      deliveriesByInningsId: new Map([[innId, singleInningsDeliveries()]]),
    });
    const inn = built.innings[0]!.innings;
    expect(inn.extras).toBeGreaterThanOrEqual(0);
    expect(inn.extrasBreakdown).toBeDefined();
  });

  it("includes fall of wickets", () => {
    const data = buildTwoInnings("red_wings", "opponent");
    expect(data.innings[0]!.innings.fallOfWickets.length).toBe(1);
    expect(data.innings[0]!.innings.fallOfWickets[0]!.batter).toBe("Hashim");
  });

  it("includes partnerships when deliveries exist", () => {
    const innId = "inn-p";
    const built = buildFullMatchScorecard({
      match: baseMatch(),
      seriesName: null,
      tournamentName: null,
      playerOfMatchId: null,
    playerOfMatchName: null,
      squad: [],
      innings: [
        inningsRow({
          id: innId,
          innings_number: 1,
          batting_team: "red_wings",
          bowling_team: "opponent",
        }),
      ],
      deliveriesByInningsId: new Map([[innId, singleInningsDeliveries()]]),
    });
    expect(built.innings[0]!.innings.partnerships.length).toBeGreaterThan(0);
  });

  it("groups over-by-over with ball labels", () => {
    const deliveries = singleInningsDeliveries();
    const grouped = groupDeliveriesByOver(deliveries);
    expect(grouped.length).toBeGreaterThan(0);
    expect(formatDeliveryLabel(deliveries[0]!)).toBeTruthy();
    const innId = "inn-ov";
    const built = buildFullMatchScorecard({
      match: baseMatch(),
      seriesName: null,
      tournamentName: null,
      playerOfMatchId: null,
    playerOfMatchName: null,
      squad: [],
      innings: [
        inningsRow({
          id: innId,
          innings_number: 1,
          batting_team: "red_wings",
          bowling_team: "opponent",
        }),
      ],
      deliveriesByInningsId: new Map([[innId, deliveries]]),
    });
    expect(built.innings[0]!.overByOver[0]!.balls.length).toBeGreaterThan(0);
  });

  it("formats dismissals for scorecard batting rows", () => {
    const innId = "inn-dismiss";
    const built = buildFullMatchScorecard({
      match: baseMatch(),
      seriesName: null,
      tournamentName: null,
      playerOfMatchId: null,
    playerOfMatchName: null,
      squad: [],
      innings: [
        inningsRow({
          id: innId,
          innings_number: 1,
          batting_team: "red_wings",
          bowling_team: "opponent",
        }),
      ],
      deliveriesByInningsId: new Map([[innId, singleInningsDeliveries()]]),
    });
    const out = built.innings[0]!.innings.battingFigures.find(
      (b) => b.name === "Hashim",
    );
    expect(out?.dismissal).toBe("b Mujahid");
  });

  it("marks guest players in batting figures", () => {
    let s = createEmptyInningsState(20);
    const guestP: ActiveParticipants = {
      strikerPlayerId: GUEST,
      strikerName: "Guest Player",
      nonStrikerPlayerId: RW2,
      nonStrikerName: "Fixed",
      bowlerPlayerId: null,
      bowlerName: "Opp",
    };
    const d = buildNormalRunDelivery(s, guestP, uuid(1), 1);
    s = applyDeliveryToState(s, d);
    const innId = "inn-guest";
    const built = buildFullMatchScorecard({
      match: baseMatch(),
      seriesName: null,
      tournamentName: null,
      playerOfMatchId: null,
    playerOfMatchName: null,
      squad: [
        {
          playerId: GUEST,
          fullName: "Guest Player",
          jerseyNumber: null,
          isCaptain: false,
          isWicketkeeper: false,
          squadStatus: "playing_xi",
          isGuest: true,
          battingPosition: 1,
          squadOrder: 0,
        },
      ],
      innings: [
        inningsRow({
          id: innId,
          innings_number: 1,
          batting_team: "red_wings",
          bowling_team: "opponent",
        }),
      ],
      deliveriesByInningsId: new Map([[innId, [d]]]),
    });
    const guest = built.innings[0]!.innings.battingFigures.find(
      (b) => b.name === "Guest Player",
    );
    expect(guest?.isGuest).toBe(true);
  });

  it("supports manual opponent batter names", () => {
    let s = createEmptyInningsState(20);
    const opp: ActiveParticipants = {
      strikerPlayerId: null,
      strikerName: "Manual Opp",
      nonStrikerPlayerId: null,
      nonStrikerName: "Opp Two",
      bowlerPlayerId: RW3,
      bowlerName: "Mujahid",
    };
    const d = buildNormalRunDelivery(s, opp, uuid(1), 3);
    const innId = "inn-manual";
    const built = buildFullMatchScorecard({
      match: baseMatch(),
      seriesName: null,
      tournamentName: null,
      playerOfMatchId: null,
    playerOfMatchName: null,
      squad: [],
      innings: [
        inningsRow({
          id: innId,
          innings_number: 1,
          batting_team: "opponent",
          bowling_team: "red_wings",
        }),
      ],
      deliveriesByInningsId: new Map([[innId, [d]]]),
    });
    expect(
      built.innings[0]!.innings.battingFigures.some((b) => b.name === "Manual Opp"),
    ).toBe(true);
  });

  it("supports large batting pools (15+ appearances)", () => {
    const innId = "inn-big";
    let s = createEmptyInningsState(20);
    const deliveries: DeliveryInput[] = [];
    for (let i = 0; i < 15; i += 1) {
      const participants: ActiveParticipants = {
        strikerPlayerId:
          i % 2 === 0
            ? `00000000-0000-4000-8000-${String(i + 1).padStart(12, "0")}`
            : null,
        strikerName: `Batter ${i}`,
        nonStrikerPlayerId: RW2,
        nonStrikerName: "Fixed NS",
        bowlerPlayerId: null,
        bowlerName: "Opp Bowler",
      };
      const d = buildNormalRunDelivery(s, participants, uuid(100 + i), 1);
      s = applyDeliveryToState(s, d);
      deliveries.push(d);
    }
    const built = buildFullMatchScorecard({
      match: baseMatch(),
      seriesName: null,
      tournamentName: null,
      playerOfMatchId: null,
    playerOfMatchName: null,
      squad: [],
      innings: [
        inningsRow({
          id: innId,
          innings_number: 1,
          batting_team: "red_wings",
          bowling_team: "opponent",
        }),
      ],
      deliveriesByInningsId: new Map([[innId, deliveries]]),
    });
    expect(built.innings[0]!.innings.battingFigures.length).toBeGreaterThanOrEqual(
      10,
    );
  });

  it("completed match document includes toss and series metadata", () => {
    const data = buildTwoInnings("red_wings", "opponent");
    expect(data.document.tossSummary).toBeTruthy();
    expect(data.document.seriesName).toBe("League");
    expect(data.status).toBe("completed");
  });

  it("missing innings yields no scorecard rows (loader contract)", () => {
    const built = buildFullMatchScorecard({
      match: baseMatch(),
      seriesName: null,
      tournamentName: null,
      playerOfMatchId: null,
    playerOfMatchName: null,
      squad: [],
      innings: [],
      deliveriesByInningsId: new Map(),
    });
    expect(built.innings).toHaveLength(0);
  });
});
