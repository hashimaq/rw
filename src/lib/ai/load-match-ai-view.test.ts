import { describe, expect, it } from "vitest";
import { buildMatchAiAnalysisView } from "@/lib/ai/load-match-ai-view";
import type { FullMatchScorecardData } from "@/lib/scorecard/types";
import { MATCH_AI_ANALYSIS_VERSION } from "@/lib/ai/match-analysis-types";

function minimalScorecard(): FullMatchScorecardData {
  return {
    matchId: "m1",
    shareSlug: "slug",
    status: "completed",
    document: {
      matchNumber: "M1",
      matchDate: null,
      venue: null,
      opponent: "Rivals",
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
        inningsId: "i1",
        inningsNumber: 1,
        battingTeam: "red_wings",
        bowlingTeam: "opponent",
        inningsStatus: "completed",
        target: null,
        oversLimit: 20,
        persistedTotalRuns: 48,
        persistedWickets: 1,
        innings: {
          inningsNumber: 1,
          battingTeam: "red_wings",
          bowlingTeam: "opponent",
          totalRuns: 48,
          wickets: 1,
          overs: "5.0",
          extras: 0,
          extrasBreakdown: {
            wides: 0,
            noBalls: 0,
            byes: 0,
            legByes: 0,
            penalty: 0,
          },
          runRate: 9.6,
          target: null,
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
      assigned: false,
      playerId: null,
      name: null,
      teamLabel: null,
      performanceSummary: null,
    },
  };
}

describe("buildMatchAiAnalysisView", () => {
  it("resolves Man of the Match name from stored analysis when participant key matches", () => {
    const scorecard = minimalScorecard();
    const view = buildMatchAiAnalysisView(
      {
        status: "completed",
        error_message: null,
        generated_analysis: {
          version: MATCH_AI_ANALYSIS_VERSION,
          man_of_the_match: {
            participant_key: "name:hashim",
            name: "Hashim",
            player_id: null,
            reason: "Top score",
            narrative: "Scored 32 in the chase.",
          },
          player_summaries: [
            {
              participant_key: "name:hashim",
              summary: "Decisive knock.",
            },
          ],
        },
      },
      scorecard,
      [],
      false,
    );
    expect(view.state).toBe("ready");
    if (view.state !== "ready") return;
    expect(view.manOfTheMatch.name).toBe("Hashim");
    expect(view.manOfTheMatch.narrative).toContain("32");
  });

  it("falls back to stored player name when participant key drifted", () => {
    const scorecard = minimalScorecard();
    const view = buildMatchAiAnalysisView(
      {
        status: "completed",
        error_message: null,
        generated_analysis: {
          version: MATCH_AI_ANALYSIS_VERSION,
          man_of_the_match: {
            participant_key: "stale-key",
            name: "Hashim",
            player_id: null,
            reason: "Top score",
            narrative: "Match-winning runs.",
          },
          player_summaries: [
            { participant_key: "stale-key", summary: "Ignored." },
            { participant_key: "name:hashim", summary: "Decisive knock." },
          ],
        },
      },
      scorecard,
      [],
      false,
    );
    expect(view.state).toBe("ready");
    if (view.state !== "ready") return;
    expect(view.manOfTheMatch.name).toBe("Hashim");
  });
});
