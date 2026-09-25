import { describe, expect, it } from "vitest";
import { yetToBatForInnings } from "@/lib/scorecard/yet-to-bat";
import type { ScorecardInningsDocument } from "@/lib/scorecard/types";

function doc(
  overrides: Partial<ScorecardInningsDocument> = {},
): ScorecardInningsDocument {
  return {
    inningsNumber: 1,
    battingTeam: "red_wings",
    bowlingTeam: "opponent",
    totalRuns: 100,
    wickets: 5,
    overs: "20.0",
    extras: 5,
    extrasBreakdown: {
      wides: 1,
      noBalls: 0,
      byes: 0,
      legByes: 0,
      penalty: 0,
    },
    runRate: 5,
    target: null,
    battingFigures: [{ name: "Hashim", playerId: null, runs: 50, balls: 40, fours: 5, sixes: 1, strikeRate: 125, dismissal: null, isNotOut: true, isGuest: false }],
    bowlingFigures: [],
    fallOfWickets: [],
    partnerships: [],
    ...overrides,
  };
}

describe("yetToBatForInnings", () => {
  it("lists Red Wings XI members who did not bat", () => {
    expect(
      yetToBatForInnings(doc(), [
        { name: "Hashim", jerseyNumber: 7, isCaptain: true, isWicketkeeper: false },
        { name: "Ali", jerseyNumber: 3, isCaptain: false, isWicketkeeper: true },
      ]),
    ).toEqual(["Ali (WK)"]);
  });

  it("returns empty for opponent batting (no opponent XI in data)", () => {
    expect(
      yetToBatForInnings(
        doc({ battingTeam: "opponent", battingFigures: [] }),
        [{ name: "Hashim", jerseyNumber: 7, isCaptain: false, isWicketkeeper: false }],
      ),
    ).toEqual([]);
  });
});
