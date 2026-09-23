import { describe, expect, it } from "vitest";
import type { MatchPerformanceDataset } from "@/lib/ai/match-analysis-types";
import {
  parseMatchAiModelOutput,
  validateModelOutputAgainstDataset,
} from "@/lib/ai/validate-match-analysis-output";

const dataset: MatchPerformanceDataset = {
  matchId: "m1",
  opponentName: "Rivals",
  resultSummary: null,
  inningsSummaries: [],
  participants: [
    {
      participantKey: "a",
      name: "Alpha",
      playerId: null,
      teamLabel: "Red Wings",
      participation: "batting",
    },
    {
      participantKey: "b",
      name: "Beta",
      playerId: null,
      teamLabel: "Red Wings",
      participation: "bowling",
    },
  ],
};

describe("validateModelOutputAgainstDataset", () => {
  it("accepts valid output for all participants", () => {
    const output = parseMatchAiModelOutput({
      man_of_the_match_participant_key: "a",
      man_of_the_match_reason: "Best batting",
      man_of_the_match_narrative: "Set the platform.",
      player_summaries: [
        { participant_key: "a", summary: "Top batter." },
        { participant_key: "b", summary: "Tight spell." },
      ],
    });
    expect(() => validateModelOutputAgainstDataset(output, dataset)).not.toThrow();
  });

  it("rejects unknown participant keys", () => {
    const output = parseMatchAiModelOutput({
      man_of_the_match_participant_key: "unknown",
      man_of_the_match_reason: "x",
      man_of_the_match_narrative: "y",
      player_summaries: [
        { participant_key: "a", summary: "s" },
        { participant_key: "b", summary: "s" },
      ],
    });
    expect(() => validateModelOutputAgainstDataset(output, dataset)).toThrow(
      /not in the match dataset/,
    );
  });
});
