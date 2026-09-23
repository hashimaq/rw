import "server-only";

import {
  buildMatchAnalysisPromptPayload,
  MATCH_ANALYSIS_SYSTEM_INSTRUCTION,
} from "@/lib/ai/match-analysis-prompt";
import type { MatchPerformanceDataset } from "@/lib/ai/match-analysis-types";
import { parseMatchAiModelOutput } from "@/lib/ai/validate-match-analysis-output";
import type { MatchAiProviderResult } from "@/lib/ai/providers/types";
import { generateGeminiStructuredResponse } from "@/lib/ai/gemini/generate-structured-response";
import { matchAiModelOutputJsonSchema } from "@/lib/ai/gemini/match-ai-model-json-schema";

export async function requestGeminiMatchAnalysis(
  dataset: MatchPerformanceDataset,
): Promise<MatchAiProviderResult> {
  const { data, model } = await generateGeminiStructuredResponse({
    systemInstruction: MATCH_ANALYSIS_SYSTEM_INSTRUCTION,
    userPayload: buildMatchAnalysisPromptPayload(dataset),
    parse: parseMatchAiModelOutput,
    responseJsonSchema: matchAiModelOutputJsonSchema as unknown as Record<
      string,
      unknown
    >,
  });

  return {
    output: data,
    model,
    provider: "gemini",
  };
}
