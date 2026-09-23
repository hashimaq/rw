import { afterEach, describe, expect, it, vi } from "vitest";
import type { MatchPerformanceDataset } from "@/lib/ai/match-analysis-types";

vi.mock("@/lib/ai/gemini/gemini-match-analysis-provider", () => ({
  requestGeminiMatchAnalysis: vi.fn(),
}));
vi.mock("@/lib/ai/openai-match-analysis", () => ({
  requestOpenAiMatchAnalysis: vi.fn(),
}));

import { requestGeminiMatchAnalysis } from "@/lib/ai/gemini/gemini-match-analysis-provider";
import { requestOpenAiMatchAnalysis } from "@/lib/ai/openai-match-analysis";
import { requestMatchAiAnalysis } from "@/lib/ai/providers/request-match-ai-analysis";

const dataset: MatchPerformanceDataset = {
  matchId: "00000000-0000-0000-0000-000000000001",
  opponentName: "Opponent",
  resultSummary: "Red Wings won",
  inningsSummaries: [],
  participants: [
    {
      participantKey: "p1",
      name: "Player One",
      playerId: null,
      teamLabel: "Red Wings",
      participation: "batting",
      batting: {
        runs: 10,
        balls: 8,
        fours: 1,
        sixes: 0,
        strikeRate: 125,
        isNotOut: true,
        dismissal: null,
      },
    },
  ],
};

describe("requestMatchAiAnalysis", () => {
  const originalProvider = process.env.MATCH_AI_PROVIDER;

  afterEach(() => {
    vi.clearAllMocks();
    if (originalProvider === undefined) {
      delete process.env.MATCH_AI_PROVIDER;
    } else {
      process.env.MATCH_AI_PROVIDER = originalProvider;
    }
  });

  it("uses Gemini by default", async () => {
    vi.mocked(requestGeminiMatchAnalysis).mockResolvedValue({
      output: {
        man_of_the_match_participant_key: "p1",
        man_of_the_match_reason: "Top score",
        man_of_the_match_narrative: "Led the chase.",
        player_summaries: [{ participant_key: "p1", summary: "Solid knock." }],
      },
      model: "gemini-3.5-flash-lite",
      provider: "gemini",
    });

    const result = await requestMatchAiAnalysis(dataset);
    expect(result.provider).toBe("gemini");
    expect(requestGeminiMatchAnalysis).toHaveBeenCalledWith(dataset);
    expect(requestOpenAiMatchAnalysis).not.toHaveBeenCalled();
  });

  it("can route to OpenAI when configured", async () => {
    process.env.MATCH_AI_PROVIDER = "openai";
    vi.mocked(requestOpenAiMatchAnalysis).mockResolvedValue({
      output: {
        man_of_the_match_participant_key: "p1",
        man_of_the_match_reason: "Top score",
        man_of_the_match_narrative: "Led the chase.",
        player_summaries: [{ participant_key: "p1", summary: "Solid knock." }],
      },
      model: "gpt-4o-mini",
      provider: "openai",
    });

    const result = await requestMatchAiAnalysis(dataset);
    expect(result.provider).toBe("openai");
    expect(requestOpenAiMatchAnalysis).toHaveBeenCalledWith(dataset);
  });
});
