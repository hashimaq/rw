import { describe, expect, it } from "vitest";
import {
  inningsScorecardDisplayState,
  shouldShowSecondInningsPlaceholder,
} from "@/lib/scorecard/scorecard-innings-display";
import type { ScorecardInningsBuilt } from "@/lib/scorecard/types";

function built(
  overrides: Partial<ScorecardInningsBuilt>,
): ScorecardInningsBuilt {
  return {
    inningsId: "i1",
    inningsNumber: 1,
    battingTeam: "red_wings",
    bowlingTeam: "opponent",
    inningsStatus: "completed",
    target: null,
    oversLimit: 20,
    persistedTotalRuns: 100,
    persistedWickets: 5,
    innings: {
      inningsNumber: 1,
      battingTeam: "red_wings",
      bowlingTeam: "opponent",
      totalRuns: 100,
      wickets: 5,
      overs: "20.0",
      extras: 10,
      extrasBreakdown: {
        wides: 0,
        noBalls: 0,
        byes: 0,
        legByes: 0,
        penalty: 0,
      },
      runRate: 5,
      target: null,
      battingFigures: [],
      bowlingFigures: [],
      fallOfWickets: [],
      partnerships: [],
    },
    overByOver: [{ overNumber: 0, displayOverNumber: 1, runs: 6, balls: [] }],
    ...overrides,
  };
}

describe("scorecard innings display", () => {
  it("marks not-started second innings", () => {
    expect(
      inningsScorecardDisplayState(
        built({ inningsStatus: "not_started", overByOver: [] }),
      ),
    ).toBe("not_started");
  });

  it("shows second innings placeholder when first is completed only", () => {
    expect(
      shouldShowSecondInningsPlaceholder(
        [built({ inningsStatus: "completed" })],
        "live",
      ),
    ).toBe(true);
    expect(
      shouldShowSecondInningsPlaceholder(
        [
          built({ inningsNumber: 1 }),
          built({ inningsNumber: 2, inningsId: "i2" }),
        ],
        "live",
      ),
    ).toBe(false);
  });
});
