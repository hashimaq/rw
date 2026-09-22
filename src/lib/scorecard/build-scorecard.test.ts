import { describe, expect, it } from "vitest";
import {
  applyDeliveryToState,
  buildInningsStateFromDeliveries,
  createEmptyInningsState,
  liveSummary,
} from "@/lib/scoring-engine/build-state";
import {
  buildNormalRunDelivery,
  buildNoBallDelivery,
  buildWideDelivery,
  buildWicketDelivery,
  type ActiveParticipants,
} from "@/lib/scoring-engine/delivery-builders";
import type { DeliveryInput } from "@/lib/scoring-engine/types";
import type { InningsRow, Match } from "@/lib/database/types";
import { buildFullMatchScorecard } from "@/lib/scorecard/build-scorecard";
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
    status: "live",
    series_id: null,
    tournament_id: null,
    toss_winner: "red_wings",
    toss_decision: "bat",
    red_wings_batting_first: true,
    result: null,
    winner: null,
    win_margin: null,
    win_margin_type: null,
    scorer_pin_hash: "hash",
    is_public_live: true,
    is_public_scorecard: true,
    share_slug: "abc123",
    player_of_match_id: null,
    created_by: null,
    created_at: "2026-01-01T00:00:00Z",
    updated_at: "2026-01-01T00:00:00Z",
    started_at: null,
    completed_at: null,
    ...overrides,
  };
}

function inningsRow(
  overrides: Partial<InningsRow> & Pick<InningsRow, "id" | "innings_number" | "batting_team" | "bowling_team">,
): InningsRow {
  return {
    match_id: baseMatch().id,
    innings_status: "in_progress",
    target: null,
    overs_limit: 20,
    total_runs: 0,
    wickets: 0,
    completed_at: null,
    created_at: "2026-01-01T00:00:00Z",
    ...overrides,
  };
}

function deliveriesForSingleInnings(): DeliveryInput[] {
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

describe("buildFullMatchScorecard", () => {
  it("rebuilds single innings batting, bowling, extras, and wickets from deliveries", () => {
    const deliveries = deliveriesForSingleInnings();
    const innId = "inn-1-0000-0000-0000-000000000001";
    const engine = buildInningsStateFromDeliveries(deliveries, 20);
    const summary = liveSummary(engine);

    const built = buildFullMatchScorecard({
      match: baseMatch(),
      seriesName: null,
      tournamentName: null,
      playerOfMatchId: null,
      playerOfMatchName: null,
      squad: [
        {
          playerId: RW,
          fullName: "Hashim",
          jerseyNumber: 7,
          isCaptain: true,
          isWicketkeeper: false,
          squadStatus: "playing_xi",
          isGuest: false,
          battingPosition: 1,
          squadOrder: 0,
        },
        {
          playerId: GUEST,
          fullName: "Guest Batter",
          jerseyNumber: null,
          isCaptain: false,
          isWicketkeeper: false,
          squadStatus: "playing_xi",
          isGuest: true,
          battingPosition: 2,
          squadOrder: 1,
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
      deliveriesByInningsId: new Map([[innId, deliveries]]),
    });

    expect(built.innings).toHaveLength(1);
    const doc = built.innings[0]!.innings;
    expect(doc.totalRuns).toBe(engine.totalRuns);
    expect(doc.wickets).toBe(engine.wickets);
    expect(doc.extras).toBe(engine.extras);
    expect(doc.battingFigures.length).toBeGreaterThan(0);
    expect(doc.bowlingFigures[0]!.wickets).toBe(1);
    expect(doc.bowlingFigures[0]!.wides).toBe(0);
    expect(doc.bowlingFigures[0]!.noBalls).toBe(0);
    expect(doc.fallOfWickets).toHaveLength(1);
    expect(summary.totalRuns).toBe(doc.totalRuns);
  });

  it("maps per-bowler wide and no-ball delivery counts", () => {
    let s = createEmptyInningsState(20);
    const list: DeliveryInput[] = [];
    const w = buildWideDelivery(s, P, uuid(10), 0);
    s = applyDeliveryToState(s, w);
    list.push(w);
    const nb = buildNoBallDelivery(s, P, uuid(11), 0);
    list.push(nb);

    const innId = "inn-extras-0000-0000-0000-000000000001";
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
      deliveriesByInningsId: new Map([[innId, list]]),
    });

    const bw = built.innings[0]!.innings.bowlingFigures[0]!;
    expect(bw.wides).toBe(1);
    expect(bw.noBalls).toBe(1);
  });

  it("loads two innings independently with correct batting teams", () => {
    const inn1Id = "11111111-1111-4111-8111-111111111101";
    const inn2Id = "11111111-1111-4111-8111-111111111102";
    const d1 = deliveriesForSingleInnings();
    const d2: DeliveryInput[] = [];

    const built = buildFullMatchScorecard({
      match: baseMatch({ status: "completed" }),
      seriesName: "Summer Series",
      tournamentName: null,
      playerOfMatchId: null,
      playerOfMatchName: null,
      squad: [],
      innings: [
        inningsRow({
          id: inn1Id,
          innings_number: 1,
          batting_team: "red_wings",
          bowling_team: "opponent",
          innings_status: "completed",
          total_runs: 50,
          wickets: 2,
        }),
        inningsRow({
          id: inn2Id,
          innings_number: 2,
          batting_team: "opponent",
          bowling_team: "red_wings",
          innings_status: "completed",
          target: 51,
          total_runs: 30,
          wickets: 10,
        }),
      ],
      deliveriesByInningsId: new Map([
        [inn1Id, d1],
        [inn2Id, d2],
      ]),
    });

    expect(built.innings).toHaveLength(2);
    expect(built.innings[0]!.battingTeam).toBe("red_wings");
    expect(built.innings[1]!.battingTeam).toBe("opponent");
    expect(built.innings[1]!.target).toBe(51);
    expect(built.document.seriesName).toBe("Summer Series");
    expect(built.document.resultSummary).toBeNull();
  });

  it("supports Red Wings batting first (1st innings RW bat)", () => {
    const innId = "inn-rw-bat-first";
    const built = buildFullMatchScorecard({
      match: baseMatch({ red_wings_batting_first: true }),
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
      deliveriesByInningsId: new Map([[innId, []]]),
    });
    expect(built.innings[0]!.battingTeam).toBe("red_wings");
  });

  it("supports Red Wings bowling first (1st innings opponent bat)", () => {
    const innId = "inn-rw-bowl-first";
    const built = buildFullMatchScorecard({
      match: baseMatch({ red_wings_batting_first: false }),
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
      deliveriesByInningsId: new Map([[innId, []]]),
    });
    expect(built.innings[0]!.battingTeam).toBe("opponent");
    expect(built.innings[0]!.bowlingTeam).toBe("red_wings");
  });

  it("supports Red Wings batting second (2nd innings RW bat)", () => {
    const inn2Id = "inn-rw-bat-second";
    const built = buildFullMatchScorecard({
      match: baseMatch(),
      seriesName: null,
      tournamentName: null,
      playerOfMatchId: null,
      playerOfMatchName: null,
      squad: [],
      innings: [
        inningsRow({
          id: "inn1",
          innings_number: 1,
          batting_team: "opponent",
          bowling_team: "red_wings",
          innings_status: "completed",
        }),
        inningsRow({
          id: inn2Id,
          innings_number: 2,
          batting_team: "red_wings",
          bowling_team: "opponent",
          target: 121,
        }),
      ],
      deliveriesByInningsId: new Map([
        ["inn1", []],
        [inn2Id, []],
      ]),
    });
    expect(built.innings[1]!.battingTeam).toBe("red_wings");
    expect(built.innings[1]!.target).toBe(121);
  });

  it("marks guest players and opponent name-only batters", () => {
    const innId = "inn-guest";
    let s = createEmptyInningsState(20);
    const opp: ActiveParticipants = {
      strikerPlayerId: null,
      strikerName: "Opp Manual Name",
      nonStrikerPlayerId: null,
      nonStrikerName: "Opp Two",
      bowlerPlayerId: RW3,
      bowlerName: "Mujahid",
    };
    const d1 = buildNormalRunDelivery(s, opp, uuid(1), 2);
    s = applyDeliveryToState(s, d1);

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
          batting_team: "opponent",
          bowling_team: "red_wings",
        }),
      ],
      deliveriesByInningsId: new Map([[innId, [d1]]]),
    });

    const oppBatter = built.innings[0]!.innings.battingFigures.find(
      (b) => b.name === "Opp Manual Name",
    );
    expect(oppBatter?.runs).toBe(2);
    expect(oppBatter?.isGuest).toBe(false);
  });

  it("includes over-by-over labels from formatDeliveryLabel", () => {
    const innId = "inn-overs";
    const deliveries = deliveriesForSingleInnings();
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
    expect(built.innings[0]!.overByOver.length).toBeGreaterThan(0);
    expect(built.innings[0]!.overByOver[0]!.balls.length).toBeGreaterThan(0);
    expect(built.innings[0]!.overByOver[0]!.balls[0]!.label).toBeTruthy();
  });

  it("supports flexible player pools (15 batters in one innings)", () => {
    const innId = "inn-big-xi";
    let s = createEmptyInningsState(20);
    const deliveries: DeliveryInput[] = [];
    for (let i = 0; i < 15; i += 1) {
      const strikerId = i % 2 === 0 ? `00000000-0000-4000-8000-${String(i + 1).padStart(12, "0")}` : null;
      const strikerName = strikerId ? `Player ${i}` : `Guest ${i}`;
      const participants: ActiveParticipants = {
        strikerPlayerId: strikerId,
        strikerName,
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
    expect(built.innings[0]!.innings.battingFigures).toHaveLength(11);
  });
});
