import type { MatchAiProviderId } from "@/lib/ai/providers/types";

const VALID: MatchAiProviderId[] = ["gemini", "openai"];

/** Which backend generates completed-match AI analysis (server-only). */
export function resolveMatchAiProviderId(): MatchAiProviderId {
  const raw = process.env.MATCH_AI_PROVIDER?.trim().toLowerCase();
  if (raw && VALID.includes(raw as MatchAiProviderId)) {
    return raw as MatchAiProviderId;
  }
  return "gemini";
}
