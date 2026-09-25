import { describe, expect, it } from "vitest";
import { buildMatchPerformanceDataset } from "@/lib/ai/match-performance-dataset";
import type { FullMatchScorecardData } from "@/lib/scorecard/types";

function minimalScorecard(): FullMatchScorecardData {
  return {
    matchId: "m1",
    shareSlug: "abc",
    status: "completed",
    document: {
      matchNumber: "M1",
      matchDate: null,
      venue: null,
      opponent: "Opponent XI",
      seriesName: null,
      tournamentName: null,
      tossSummary: null,
      redWingsPlayingXi: [],
      innings: [],
      resultSummary: "Red Wings won",
      playerOfTheMatch: null,
      matchSummary: null,
    },
    innings: [
      {
        inningsId: "i2",
        inningsNumber: 2,
        battingTeam: "red_wings",
        bowlingTeam: "opponent",
        inningsStatus: "completed",
        target: 48,
        oversLimit: 20,
        persistedTotalRuns: 48,
        persistedWickets: 1,
        innings: {
          inningsNumber: 2,
          battingTeam: "red_wings",
          bowlingTeam: "opponent",
          totalRuns: 48,
          wickets: 1,
          overs: "2.2",
          extras: 0,
          extrasBreakdown: {
            wides: 0,
            noBalls: 0,
            byes: 0,
            legByes: 0,
            penalty: 0,
          },
          runRate: null,
          target: 48,
          battingFigures: [
            {
              name: "Hashim",
              playerId: null,
              runs: 32,
              balls: 6,
              fours: 5,
              sixes: 2,
              strikeRate: 533.33,
              dismissal: null,
              isNotOut: true,
              isGuest: false,
            },
            {
              name: "Bench",
              playerId: null,
              runs: 0,
              balls: 0,
              fours: 0,
              sixes: 0,
              strikeRate: 0,
              dismissal: null,
              isNotOut: false,
              isGuest: false,
              didNotBat: true,
            },
          ],
          bowlingFigures: [
            {
              name: "Kashif",
              playerId: null,
              overs: "1.2",
              maidens: 0,
              runs: 30,
              wickets: 1,
              wides: 0,
              noBalls: 0,
              economy: 25.71,
            },
          ],
          fallOfWickets: [],
          partnerships: [],
        },
        overByOver: [],
      },
    ],
    playerOfTheMatch: {
      assigned: false,
      playerId: null,
      name: null,
      teamLabel: null,
      performanceSummary: null,
    },
  };
}

describe("buildMatchPerformanceDataset", () => {
  it("includes only participating players", () => {
    const ds = buildMatchPerformanceDataset(minimalScorecard(), [
      {
        playerId: "p-hashim",
        fullName: "Hashim",
        jerseyNumber: 7,
        isCaptain: false,
        isWicketkeeper: false,
        squadStatus: "playing_xi",
        isGuest: false,
        battingPosition: 1,
        squadOrder: 0,
      },
    ]);
    expect(ds.participants.map((p) => p.name).sort()).toEqual([
      "Hashim",
      "Kashif",
    ]);
    const hashim = ds.participants.find((p) => p.name === "Hashim");
    expect(hashim?.batting?.runs).toBe(32);
    expect(hashim?.participantKey).toBe("player:p-hashim");
  });
});
