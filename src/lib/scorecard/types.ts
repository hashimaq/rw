import type { PlayerOfMatchDisplay } from "@/lib/scorecard/player-of-match-display";
import type { BattingSide, InningsStatus, MatchStatus } from "@/lib/database/types";

/**
 * Structured payload for future PDF scorecard generation.
 * All fields are populated from real match data — no defaults or invented stats.
 */
export interface ScorecardDocumentData {
  matchNumber: string;
  matchDate: string | null;
  venue: string | null;
  opponent: string;
  seriesName: string | null;
  tournamentName: string | null;
  tossSummary: string | null;
  redWingsPlayingXi: Array<{
    name: string;
    jerseyNumber: number;
    isCaptain: boolean;
    isWicketkeeper: boolean;
  }>;
  innings: ScorecardInningsDocument[];
  resultSummary: string | null;
  playerOfTheMatch: string | null;
  matchSummary: string | null;
}

export interface ScorecardExtrasBreakdown {
  wides: number;
  noBalls: number;
  byes: number;
  legByes: number;
  penalty: number;
}

export interface ScorecardInningsDocument {
  inningsNumber: number;
  battingTeam: BattingSide;
  bowlingTeam: BattingSide;
  totalRuns: number;
  wickets: number;
  overs: string;
  extras: number;
  extrasBreakdown: ScorecardExtrasBreakdown;
  runRate: number | null;
  target: number | null;
  battingFigures: Array<{
    name: string;
    runs: number;
    balls: number;
    fours: number;
    sixes: number;
    strikeRate: number;
    dismissal: string | null;
    isNotOut: boolean;
    isGuest: boolean;
    /** Scorecard XI slot with no innings participation. */
    didNotBat?: boolean;
  }>;
  bowlingFigures: Array<{
    name: string;
    overs: string;
    maidens: number;
    runs: number;
    wickets: number;
    wides: number;
    noBalls: number;
    economy: number;
  }>;
  fallOfWickets: Array<{
    wicketNumber: number;
    score: number;
    batter: string;
    over: string;
  }>;
  partnerships: Array<{
    batters: [string, string];
    runs: number;
    balls: number;
  }>;
}

export interface ScorecardOverBall {
  clientEventId: string;
  label: string;
}

export interface ScorecardOverSummary {
  overNumber: number;
  displayOverNumber: number;
  runs: number;
  balls: ScorecardOverBall[];
}

/** Per-innings rebuilt state + over-by-over (Step 1 foundation). */
export interface ScorecardInningsBuilt {
  inningsId: string;
  inningsNumber: number;
  battingTeam: BattingSide;
  bowlingTeam: BattingSide;
  inningsStatus: InningsStatus;
  target: number | null;
  oversLimit: number;
  persistedTotalRuns: number;
  persistedWickets: number;
  innings: ScorecardInningsDocument;
  overByOver: ScorecardOverSummary[];
}

/** Full match scorecard loaded from DB and rebuilt from deliveries. */
export interface FullMatchScorecardData {
  matchId: string;
  shareSlug: string | null;
  status: MatchStatus;
  document: ScorecardDocumentData;
  innings: ScorecardInningsBuilt[];
  playerOfTheMatch: PlayerOfMatchDisplay;
}
