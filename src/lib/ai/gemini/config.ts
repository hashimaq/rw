import "server-only";

import { AiProviderError } from "@/lib/ai/gemini/errors";

/** Default for generateContent; verified against the Generative Language API. */
const DEFAULT_GEMINI_MODEL = "gemini-3.5-flash-lite";

export function readGeminiApiKey(): string {
  const apiKey = process.env.GEMINI_API_KEY?.trim();
  if (!apiKey) {
    throw new AiProviderError(
      "GEMINI_API_KEY is not configured",
      "missing_api_key",
    );
  }
  return apiKey;
}

export function readGeminiModel(): string {
  return (
    process.env.GEMINI_MATCH_ANALYSIS_MODEL?.trim() || DEFAULT_GEMINI_MODEL
  );
}

export function isGeminiConfigured(): boolean {
  return Boolean(process.env.GEMINI_API_KEY?.trim());
}
