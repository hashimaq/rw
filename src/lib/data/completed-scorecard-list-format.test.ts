import { describe, expect, it } from "vitest";
import {
  completedMatchSortKey,
  isCompletedStatusForArchive,
  scorecardHrefFromArchive,
  teamInningsScoreLabel,
} from "@/lib/data/completed-scorecard-list-format";
import type { CompletedScorecardSummary } from "@/lib/data/completed-scorecard-list";

function summary(
  overrides: Partial<CompletedScorecardSummary> = {},
): CompletedScorecardSummary {
  return {
    id: "m1",
    shareSlug: "slug-a",
    matchNumber: "Match #12",
    opponentName: "ABC Club",
    matchDate: "2026-09-21",
    completedAt: "2026-09-21T18:00:00Z",
    seriesName: null,
    tournamentName: null,
    resultSummary: "Red Wings won by 23 runs",
    inningsScores: [
      {
        inningsNumber: 1,
        battingTeam: "red_wings",
        totalRuns: 165,
        wickets: 7,
      },
      {
        inningsNumber: 2,
        battingTeam: "opponent",
        totalRuns: 142,
        wickets: 10,
      },
    ],
    ...overrides,
  };
}

describe("completed scorecard archive helpers", () => {
  it("formats team innings score lines", () => {
    expect(
      teamInningsScoreLabel("red_wings", "ABC", 165, 7),
    ).toBe("Red Wings 165/7");
    expect(teamInningsScoreLabel("opponent", "ABC", 142, 10)).toBe(
      "ABC 142/10",
    );
  });

  it("routes View Scorecard with from=scorecards", () => {
    expect(scorecardHrefFromArchive("abc123")).toBe(
      "/match/abc123?from=scorecards",
    );
  });

  it("sorts newest completed first by completedAt", () => {
    const a = summary({ completedAt: "2026-09-20T12:00:00Z" });
    const b = summary({
      id: "m2",
      completedAt: "2026-09-22T12:00:00Z",
    });
    expect(completedMatchSortKey(b) > completedMatchSortKey(a)).toBe(true);
  });

  it("includes only completed status for archive", () => {
    expect(isCompletedStatusForArchive("completed")).toBe(true);
    expect(isCompletedStatusForArchive("live")).toBe(false);
    expect(isCompletedStatusForArchive("setup")).toBe(false);
  });

  it("displays persisted result summary on summary model", () => {
    expect(summary().resultSummary).toBe("Red Wings won by 23 runs");
  });
});

describe("scorecard archive exclusions (query contract)", () => {
  it("live/setup statuses are not completed archive entries", () => {
    for (const status of ["live", "setup", "abandoned"] as const) {
      expect(isCompletedStatusForArchive(status)).toBe(false);
    }
  });
});
