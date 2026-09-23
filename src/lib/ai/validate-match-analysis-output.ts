import type { MatchPerformanceDataset } from "@/lib/ai/match-analysis-types";
import {
  matchAiModelOutputSchema,
  type MatchAiModelOutput,
  storedMatchAiAnalysisSchema,
} from "@/lib/ai/match-analysis-schema";
import {
  MATCH_AI_ANALYSIS_VERSION,
  type StoredMatchAiAnalysisV1,
} from "@/lib/ai/match-analysis-types";

export function parseMatchAiModelOutput(raw: unknown): MatchAiModelOutput {
  return matchAiModelOutputSchema.parse(raw);
}

export function validateModelOutputAgainstDataset(
  output: MatchAiModelOutput,
  dataset: MatchPerformanceDataset,
): void {
  const keys = new Set(dataset.participants.map((p) => p.participantKey));
  if (!keys.has(output.man_of_the_match_participant_key)) {
    throw new Error("Man of the Match participant_key is not in the match dataset");
  }
  const summaryKeys = new Set<string>();
  for (const row of output.player_summaries) {
    if (!keys.has(row.participant_key)) {
      throw new Error(`Summary for unknown participant: ${row.participant_key}`);
    }
    if (summaryKeys.has(row.participant_key)) {
      throw new Error(`Duplicate summary for ${row.participant_key}`);
    }
    summaryKeys.add(row.participant_key);
  }
  for (const p of dataset.participants) {
    if (!summaryKeys.has(p.participantKey)) {
      throw new Error(`Missing summary for participant ${p.participantKey}`);
    }
  }
}

export function modelOutputToStoredAnalysis(
  output: MatchAiModelOutput,
  dataset: MatchPerformanceDataset,
  meta: { provider: string; model: string },
): StoredMatchAiAnalysisV1 {
  const mom = dataset.participants.find(
    (p) => p.participantKey === output.man_of_the_match_participant_key,
  );
  if (!mom) {
    throw new Error("Man of the Match participant missing from dataset");
  }
  return {
    version: MATCH_AI_ANALYSIS_VERSION,
    man_of_the_match: {
      participant_key: mom.participantKey,
      name: mom.name,
      player_id: mom.playerId,
      reason: output.man_of_the_match_reason.trim(),
      narrative: output.man_of_the_match_narrative.trim(),
    },
    player_summaries: output.player_summaries.map((s) => ({
      participant_key: s.participant_key,
      summary: s.summary.trim(),
    })),
    provider: meta.provider,
    model: meta.model,
  };
}

export function parseStoredMatchAiAnalysis(
  raw: unknown,
): StoredMatchAiAnalysisV1 | null {
  const parsed = storedMatchAiAnalysisSchema.safeParse(raw);
  return parsed.success ? parsed.data : null;
}
