import "server-only";

import type { MatchPerformanceDataset } from "@/lib/ai/match-analysis-types";
import {
  buildMatchAnalysisPromptPayload,
  MATCH_ANALYSIS_SYSTEM_INSTRUCTION,
} from "@/lib/ai/match-analysis-prompt";
import type { MatchAiModelOutput } from "@/lib/ai/match-analysis-schema";
import { parseMatchAiModelOutput } from "@/lib/ai/validate-match-analysis-output";

const DEFAULT_MODEL = "gpt-4o-mini";

export async function requestOpenAiMatchAnalysis(
  dataset: MatchPerformanceDataset,
): Promise<{ output: MatchAiModelOutput; model: string; provider: string }> {
  const apiKey = process.env.OPENAI_API_KEY?.trim();
  if (!apiKey) {
    throw new Error("OPENAI_API_KEY is not configured");
  }

  const model = process.env.OPENAI_MATCH_ANALYSIS_MODEL?.trim() || DEFAULT_MODEL;
  const body = {
    model,
    temperature: 0.2,
    response_format: { type: "json_object" as const },
    messages: [
      {
        role: "system" as const,
        content: MATCH_ANALYSIS_SYSTEM_INSTRUCTION,
      },
      {
        role: "user" as const,
        content: JSON.stringify(buildMatchAnalysisPromptPayload(dataset)),
      },
    ],
  };

  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    throw new Error(`OpenAI request failed (${res.status})`);
  }

  const json = (await res.json()) as {
    choices?: Array<{ message?: { content?: string } }>;
  };
  const content = json.choices?.[0]?.message?.content;
  if (!content) throw new Error("OpenAI returned empty content");

  let parsed: unknown;
  try {
    parsed = JSON.parse(content);
  } catch {
    throw new Error("OpenAI returned non-JSON content");
  }

  return {
    output: parseMatchAiModelOutput(parsed),
    model,
    provider: "openai",
  };
}
