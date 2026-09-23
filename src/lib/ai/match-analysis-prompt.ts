import type { MatchPerformanceDataset } from "@/lib/ai/match-analysis-types";

/** Shared prompt payload for any match-analysis AI provider. */
export function buildMatchAnalysisPromptPayload(
  dataset: MatchPerformanceDataset,
) {
  return {
    instruction:
      "You are analyzing an official cricket match dataset. All supplied numerical statistics are authoritative — do not recalculate, alter, or add official statistics. Do not invent missing ball-by-ball events, dismissals, catches, partnerships, or pressure situations unless they appear in the data. Do not infer unsupported facts. Select Man of the Match only from participant_key values listed. Provide factual 1–2 sentence player summaries. Do not output player ratings, scores out of 10, star ratings, rankings, or leaderboards. If the dataset is sparse, keep summaries modest and factual.",
    match: {
      opponent: dataset.opponentName,
      result: dataset.resultSummary,
      innings: dataset.inningsSummaries,
    },
    participants: dataset.participants.map((p) => ({
      participant_key: p.participantKey,
      name: p.name,
      team: p.teamLabel,
      participation: p.participation,
      batting: p.batting ?? null,
      bowling: p.bowling ?? null,
    })),
    required_response: {
      man_of_the_match_participant_key:
        "Must be one of the participant_key values above",
      man_of_the_match_reason: "Short factual reason using supplied stats only",
      man_of_the_match_narrative:
        "Exciting but factual 1-2 sentence match impact summary",
      player_summaries:
        "One entry per participant_key with a short factual summary",
    },
  };
}

export const MATCH_ANALYSIS_SYSTEM_INSTRUCTION =
  "Return JSON only matching the required_response shape. Select Man of the Match by actual cricket impact from the supplied stats only. Never include numeric performance ratings or rankings in the response.";
