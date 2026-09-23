/** Stored in match_ai_analysis.generated_analysis (versioned JSON). */
export const MATCH_AI_ANALYSIS_VERSION = 1 as const;

export type StoredMatchAiAnalysisV1 = {
  version: typeof MATCH_AI_ANALYSIS_VERSION;
  man_of_the_match: {
    participant_key: string;
    name: string;
    player_id: string | null;
    reason: string;
    narrative: string;
  };
  player_summaries: Array<{
    participant_key: string;
    summary: string;
  }>;
  provider?: string;
  model?: string;
};

export type MatchParticipantBatting = {
  runs: number;
  balls: number;
  fours: number;
  sixes: number;
  strikeRate: number;
  isNotOut: boolean;
  dismissal: string | null;
};

export type MatchParticipantBowling = {
  overs: string;
  maidens: number;
  runs: number;
  wickets: number;
  wides: number;
  noBalls: number;
  economy: number;
};

export type ParticipationType =
  | "batting"
  | "bowling"
  | "batting_and_bowling";

export type MatchPerformanceParticipant = {
  participantKey: string;
  name: string;
  playerId: string | null;
  teamLabel: string;
  participation: ParticipationType;
  batting?: MatchParticipantBatting;
  bowling?: MatchParticipantBowling;
};

export type MatchPerformanceDataset = {
  matchId: string;
  opponentName: string;
  resultSummary: string | null;
  inningsSummaries: Array<{
    inningsNumber: number;
    battingTeamLabel: string;
    totalRuns: number;
    wickets: number;
    overs: string;
  }>;
  participants: MatchPerformanceParticipant[];
};

/** Public view merged with authoritative stats + persisted AI text. */
export type MatchAiAnalysisView =
  | { state: "unavailable_incomplete" }
  | { state: "pending" | "processing" }
  | { state: "failed"; message: string }
  | {
      state: "ready";
      manOfTheMatch: {
        name: string;
        playerId: string | null;
        teamLabel: string;
        reason: string;
        narrative: string;
        batting?: MatchParticipantBatting;
        bowling?: MatchParticipantBowling;
      };
      playerPerformances: Array<{
        participantKey: string;
        name: string;
        playerId: string | null;
        teamLabel: string;
        participation: ParticipationType;
        batting?: MatchParticipantBatting;
        bowling?: MatchParticipantBowling;
        aiSummary: string;
      }>;
    }
  | { state: "unavailable"; message: string };
