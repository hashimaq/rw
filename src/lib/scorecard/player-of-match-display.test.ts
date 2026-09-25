import { describe, expect, it } from "vitest";
import type { ScorecardSquadMember } from "@/lib/scorecard/build-scorecard";
import {
  buildPlayerOfMatchDisplay,
  resolvePlayerOfMatchTeam,
  summarizePlayerMatchPerformance,
} from "@/lib/scorecard/player-of-match-display";
import type { ScorecardInningsBuilt } from "@/lib/scorecard/types";

const RW_ID = "11111111-1111-4111-8111-111111111111";

function squadRw(): ScorecardSquadMember[] {
  return [
    {
      playerId: RW_ID,
      fullName: "Hashim",
      jerseyNumber: 7,
      isCaptain: true,
      isWicketkeeper: false,
      squadStatus: "playing_xi",
      isGuest: false,
      battingPosition: 1,
      squadOrder: 0,
    },
  ];
}

function inningsBuilt(
  batting: "red_wings" | "opponent",
  bowling: "red_wings" | "opponent",
  batters: { name: string; runs: number; balls: number; fours: number; sixes: number }[],
  bowlers: { name: string; wickets: number; runs: number; overs: string }[],
): ScorecardInningsBuilt {
  return {
    inningsId: "i1",
    inningsNumber: 1,
    battingTeam: batting,
    bowlingTeam: bowling,
    inningsStatus: "completed",
    target: null,
    oversLimit: 20,
    persistedTotalRuns: 100,
    persistedWickets: 5,
    overByOver: [],
    innings: {
      inningsNumber: 1,
      battingTeam: batting,
      bowlingTeam: bowling,
      totalRuns: 100,
      wickets: 5,
      overs: "20.0",
      extras: 5,
      extrasBreakdown: {
        wides: 1,
        noBalls: 0,
        byes: 2,
        legByes: 2,
        penalty: 0,
      },
      runRate: 5,
      target: null,
      battingFigures: batters.map((b) => ({
        name: b.name,
        playerId: null,
        runs: b.runs,
        balls: b.balls,
        fours: b.fours,
        sixes: b.sixes,
        strikeRate: b.balls ? (b.runs / b.balls) * 100 : 0,
        dismissal: b.balls ? "b Bowler" : null,
        isNotOut: false,
        isGuest: false,
      })),
      bowlingFigures: bowlers.map((b) => ({
        name: b.name,
        playerId: null,
        overs: b.overs,
        maidens: 0,
        runs: b.runs,
        wickets: b.wickets,
        wides: 0,
        noBalls: 0,
        economy: 6,
      })),
      fallOfWickets: [],
      partnerships: [],
    },
  };
}

describe("player of the match display", () => {
  it("shows not assigned when no player_of_match", () => {
    const d = buildPlayerOfMatchDisplay(null, null, "ABC", [], []);
    expect(d.assigned).toBe(false);
  });

  it("resolves Red Wings squad player team", () => {
    const team = resolvePlayerOfMatchTeam(
      RW_ID,
      "Hashim",
      "ABC",
      squadRw(),
      [],
    );
    expect(team).toBe("Red Wings");
  });

  it("resolves opponent from bowling figures", () => {
    const built = [
      inningsBuilt(
        "red_wings",
        "opponent",
        [{ name: "Hashim", runs: 50, balls: 30, fours: 5, sixes: 1 }],
        [{ name: "Opp Bowler", wickets: 3, runs: 24, overs: "4.0" }],
      ),
    ];
    const team = resolvePlayerOfMatchTeam(
      null,
      "Opp Bowler",
      "ABC Club",
      squadRw(),
      built,
    );
    expect(team).toBe("ABC Club");
  });

  it("summarizes batting and bowling performance", () => {
    const built = [
      inningsBuilt(
        "red_wings",
        "opponent",
        [{ name: "Hashim", runs: 58, balls: 34, fours: 5, sixes: 2 }],
        [],
      ),
    ];
    const summary = summarizePlayerMatchPerformance("Hashim", built);
    expect(summary).toContain("58 runs");
    expect(summary).toContain("5 fours");
  });

  it("does not show MoM section data for unassigned", () => {
    const built = buildPlayerOfMatchDisplay(null, null, "ABC", squadRw(), []);
    expect(built.assigned).toBe(false);
  });
});

describe("both teams in scorecard data", () => {
  it("includes opponent bowlers when Red Wings bat first", () => {
    const inn1 = inningsBuilt(
      "red_wings",
      "opponent",
      [{ name: "A", runs: 10, balls: 5, fours: 1, sixes: 0 }],
      [{ name: "Opp Spinner", wickets: 2, runs: 30, overs: "4.0" }],
    );
    expect(inn1.innings.bowlingFigures[0]?.name).toBe("Opp Spinner");
  });

  it("includes Red Wings bowlers when opponent bat first", () => {
    const inn1 = inningsBuilt(
      "opponent",
      "red_wings",
      [{ name: "Opp Bat", runs: 20, balls: 10, fours: 2, sixes: 0 }],
      [{ name: "RW Bowler", wickets: 4, runs: 21, overs: "4.0" }],
    );
    expect(inn1.innings.bowlingTeam).toBe("red_wings");
    expect(inn1.innings.bowlingFigures[0]?.name).toBe("RW Bowler");
  });
});
