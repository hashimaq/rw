import { isAiProviderConfigError } from "@/lib/ai/provider-errors";
import type { MatchAiAnalysisView } from "@/lib/ai/match-analysis-types";
import type { MatchPerformanceParticipant } from "@/lib/ai/match-analysis-types";
import { buildMatchPerformanceDataset } from "@/lib/ai/match-performance-dataset";
import { parseStoredMatchAiAnalysis } from "@/lib/ai/validate-match-analysis-output";
import type { ScorecardSquadMember } from "@/lib/scorecard/build-scorecard";
import type { FullMatchScorecardData } from "@/lib/scorecard/types";

export type MatchAiAnalysisRow = {
  status: "pending" | "processing" | "completed" | "failed";
  error_message: string | null;
  generated_analysis: unknown;
};

function normalizeName(name: string): string {
  return name.trim().toLowerCase();
}

function resolveManOfTheMatchParticipant(
  storedKey: string,
  storedName: string,
  storedPlayerId: string | null,
  participants: MatchPerformanceParticipant[],
): MatchPerformanceParticipant | null {
  const byKey = participants.find((p) => p.participantKey === storedKey);
  if (byKey) return byKey;

  if (storedPlayerId) {
    const byId = participants.find((p) => p.playerId === storedPlayerId);
    if (byId) return byId;
  }

  const norm = normalizeName(storedName);
  if (norm) {
    const byName = participants.find((p) => normalizeName(p.name) === norm);
    if (byName) return byName;
  }

  return null;
}

export function buildMatchAiAnalysisView(
  row: MatchAiAnalysisRow | null,
  scorecard: FullMatchScorecardData,
  squad: ScorecardSquadMember[],
  dataIncomplete: boolean,
): MatchAiAnalysisView {
  if (dataIncomplete) {
    return { state: "unavailable_incomplete" };
  }
  if (!row) {
    return { state: "pending" };
  }
  if (row.status === "pending" || row.status === "processing") {
    return { state: row.status };
  }
  if (row.status === "failed") {
    if (row.error_message === "incomplete_match_data") {
      return { state: "unavailable_incomplete" };
    }
    return {
      state: "failed",
      message: isAiProviderConfigError(row.error_message)
        ? "AI performance analysis unavailable."
        : "AI performance analysis unavailable.",
    };
  }

  const stored = parseStoredMatchAiAnalysis(row.generated_analysis);
  if (!stored) {
    return {
      state: "failed",
      message: "AI performance analysis unavailable.",
    };
  }

  const dataset = buildMatchPerformanceDataset(scorecard, squad);
  const momParticipant = resolveManOfTheMatchParticipant(
    stored.man_of_the_match.participant_key,
    stored.man_of_the_match.name,
    stored.man_of_the_match.player_id,
    dataset.participants,
  );

  const momName =
    momParticipant?.name?.trim() || stored.man_of_the_match.name?.trim();
  if (!momName) {
    return {
      state: "failed",
      message: "AI performance analysis unavailable.",
    };
  }

  const summaryMap = new Map(
    stored.player_summaries.map((s) => [s.participant_key, s.summary] as const),
  );

  return {
    state: "ready",
    manOfTheMatch: {
      name: momName,
      playerId:
        momParticipant?.playerId ?? stored.man_of_the_match.player_id ?? null,
      teamLabel:
        momParticipant?.teamLabel ??
        (stored.man_of_the_match.player_id &&
        squad.some((m) => m.playerId === stored.man_of_the_match.player_id)
          ? "Red Wings"
          : scorecard.document.opponent),
      reason: stored.man_of_the_match.reason,
      narrative: stored.man_of_the_match.narrative,
      batting: momParticipant?.batting,
      bowling: momParticipant?.bowling,
    },
    playerPerformances: dataset.participants.map((p) => ({
      participantKey: p.participantKey,
      name: p.name,
      playerId: p.playerId,
      teamLabel: p.teamLabel,
      participation: p.participation,
      batting: p.batting,
      bowling: p.bowling,
      aiSummary: summaryMap.get(p.participantKey) ?? "",
    })),
  };
}
