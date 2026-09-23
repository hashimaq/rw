import { describe, expect, it } from "vitest";
import { generateScorecardPdfBuffer } from "@/lib/scorecard/generate-scorecard-pdf";
import { getLastComposedPdfPageCount } from "@/lib/scorecard/scorecard-pdf-layout";
import type { FullMatchScorecardData } from "@/lib/scorecard/types";

function pdfPageCount(buf: Buffer): number {
  const s = buf.toString("latin1");
  const catalog = s.match(/\/Type\s*\/Pages[\s\S]{0,400}?\/Count\s+(\d+)/);
  if (catalog?.[1]) return Number(catalog[1]);
  return (s.match(/\/Type\s*\/Page\b/g) ?? []).length;
}

const rich: FullMatchScorecardData = {
  matchId: "m1",
  shareSlug: "abc",
  status: "completed",
  document: {
    matchNumber: "Match 12",
    matchDate: "2025-09-01",
    venue: "Red Wings Ground",
    opponent: "Hard XI",
    seriesName: null,
    tournamentName: null,
    tossSummary: "Red Wings won the toss and elected to bat",
    redWingsPlayingXi: [],
    innings: [],
    resultSummary: "Red Wings won by 9 wickets",
    playerOfTheMatch: null,
    matchSummary: null,
  },
  innings: [
    {
      inningsId: "i1",
      inningsNumber: 1,
      battingTeam: "opponent",
      bowlingTeam: "red_wings",
      inningsStatus: "completed",
      target: null,
      oversLimit: 20,
      persistedTotalRuns: 47,
      persistedWickets: 3,
      innings: {
        inningsNumber: 1,
        battingTeam: "opponent",
        bowlingTeam: "red_wings",
        totalRuns: 47,
        wickets: 3,
        overs: "5.0",
        extras: 5,
        extrasBreakdown: {
          wides: 2,
          noBalls: 1,
          byes: 1,
          legByes: 1,
          penalty: 0,
        },
        runRate: 9.4,
        target: null,
        battingFigures: [
          {
            name: "Opener With A Very Long Name For Layout",
            runs: 20,
            balls: 12,
            fours: 2,
            sixes: 1,
            strikeRate: 166.67,
            dismissal: "c Keeper b Bowler Name",
            isNotOut: false,
            isGuest: false,
          },
        ],
        bowlingFigures: [
          {
            name: "Kashif",
            overs: "3.0",
            maidens: 0,
            runs: 30,
            wickets: 1,
            wides: 1,
            noBalls: 0,
            economy: 10,
          },
        ],
        fallOfWickets: [
          { wicketNumber: 1, score: 12, batter: "Opener", over: "1.4" },
        ],
        partnerships: [{ batters: ["A", "B"], runs: 30, balls: 24 }],
      },
      overByOver: [],
    },
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
        overs: "5.4",
        extras: 2,
        extrasBreakdown: {
          wides: 1,
          noBalls: 0,
          byes: 0,
          legByes: 1,
          penalty: 0,
        },
        runRate: 8.47,
        target: 48,
        battingFigures: [
          {
            name: "Hashim",
            runs: 32,
            balls: 18,
            fours: 4,
            sixes: 1,
            strikeRate: 177.78,
            dismissal: null,
            isNotOut: true,
            isGuest: false,
          },
        ],
        bowlingFigures: [],
        fallOfWickets: [],
        partnerships: [],
      },
      overByOver: [],
    },
  ],
  playerOfTheMatch: {
    assigned: true,
    playerId: null,
    name: "Hashim",
    teamLabel: "Red Wings",
    performanceSummary: null,
  },
  aiAnalysis: {
    state: "ready",
    manOfTheMatch: {
      name: "Hashim",
      playerId: null,
      teamLabel: "Red Wings",
      reason: "Match-winning chase",
      narrative:
        "Hashim scored 32 runs at a strong strike rate during the successful chase.",
      batting: {
        runs: 32,
        balls: 18,
        fours: 4,
        sixes: 1,
        strikeRate: 177.78,
        isNotOut: true,
        dismissal: null,
      },
    },
    playerPerformances: [
      {
        participantKey: "h",
        name: "Hashim",
        playerId: null,
        teamLabel: "Red Wings",
        participation: "batting",
        batting: {
          runs: 32,
          balls: 18,
          fours: 4,
          sixes: 1,
          strikeRate: 177.78,
          isNotOut: true,
          dismissal: null,
        },
        aiSummary:
          "Hashim anchored the successful chase with 32 runs and provided the bulk of the required scoring.",
      },
      {
        participantKey: "k",
        name: "Kashif",
        playerId: null,
        teamLabel: "Red Wings",
        participation: "bowling",
        bowling: {
          overs: "3.0",
          maidens: 0,
          runs: 30,
          wickets: 1,
          wides: 1,
          noBalls: 0,
          economy: 10,
        },
        aiSummary:
          "Kashif made the key bowling contribution, taking 1 wicket while conceding 30 runs across his spell.",
      },
    ],
  },
};

describe("generateScorecardPdfBuffer", () => {
  it("returns a valid PDF header", async () => {
    const buf = await generateScorecardPdfBuffer({
      matchId: "m0",
      shareSlug: "x",
      status: "completed",
      document: {
        matchNumber: "M1",
        matchDate: "2025-01-01",
        venue: "Ground",
        opponent: "Opponent",
        seriesName: null,
        tournamentName: null,
        tossSummary: null,
        redWingsPlayingXi: [],
        innings: [],
        resultSummary: "Red Wings won",
        playerOfTheMatch: null,
        matchSummary: null,
      },
      innings: [],
      playerOfTheMatch: {
        assigned: false,
        playerId: null,
        name: null,
        teamLabel: null,
        performanceSummary: null,
      },
    });
    expect(buf.length).toBeGreaterThan(500);
    expect(buf.subarray(0, 4).toString()).toBe("%PDF");
  });

  it("produces a multi-page rich scorecard PDF", async () => {
    await generateScorecardPdfBuffer({
      matchId: "m0",
      shareSlug: "x",
      status: "completed",
      document: rich.document,
      innings: [],
      playerOfTheMatch: rich.playerOfTheMatch,
    });
    const minimalPages = getLastComposedPdfPageCount();
    const buf = await generateScorecardPdfBuffer(rich);
    const pages = getLastComposedPdfPageCount();
    const pdfPages = pdfPageCount(buf);
    expect(buf.length).toBeGreaterThan(4500);
    expect(pages).toBeGreaterThanOrEqual(2);
    expect(pages).toBeLessThanOrEqual(3);
    expect(pdfPages).toBeLessThanOrEqual(3);
    expect(pages).toBeGreaterThanOrEqual(minimalPages);
  });
});
