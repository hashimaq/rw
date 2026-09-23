import type { MatchPerformanceDataset } from "@/lib/ai/match-analysis-types";
import type { MatchAiModelOutput } from "@/lib/ai/match-analysis-schema";

export type MatchAiProviderId = "gemini" | "openai";

export type MatchAiProviderResult = {
  output: MatchAiModelOutput;
  model: string;
  provider: MatchAiProviderId;
};

export type MatchAiAnalysisProvider = {
  id: MatchAiProviderId;
  requestMatchAnalysis: (
    dataset: MatchPerformanceDataset,
  ) => Promise<MatchAiProviderResult>;
};
