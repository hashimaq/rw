import "server-only";

import type { MatchPerformanceDataset } from "@/lib/ai/match-analysis-types";
import { requestGeminiMatchAnalysis } from "@/lib/ai/gemini/gemini-match-analysis-provider";
import { requestOpenAiMatchAnalysis } from "@/lib/ai/openai-match-analysis";
import { resolveMatchAiProviderId } from "@/lib/ai/providers/resolve-match-ai-provider";
import type { MatchAiProviderResult } from "@/lib/ai/providers/types";

/**
 * Match Analysis Service → provider interface → Gemini (default) or OpenAI.
 */
export async function requestMatchAiAnalysis(
  dataset: MatchPerformanceDataset,
): Promise<MatchAiProviderResult> {
  const providerId = resolveMatchAiProviderId();
  if (providerId === "openai") {
    const result = await requestOpenAiMatchAnalysis(dataset);
    return {
      output: result.output,
      model: result.model,
      provider: "openai",
    };
  }
  return requestGeminiMatchAnalysis(dataset);
}
