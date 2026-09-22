import type { BattingSide, InningsRow } from "@/lib/database/types";
import type { DeliveryInput } from "@/lib/scoring-engine/types";

export interface SquadPlayerOption {
  id: string;
  name: string;
  isCaptain: boolean;
  isWicketkeeper: boolean;
  squadStatus: "playing_xi" | "bench";
  isGuest: boolean;
}

export interface ScoringInningsInfo {
  id: string;
  inningsNumber: number;
  battingTeam: BattingSide;
  bowlingTeam: BattingSide;
  inningsStatus: InningsRow["innings_status"];
  target: number | null;
  oversLimit: number;
  totalRuns: number;
  wickets: number;
}

export interface ScoringBootstrap {
  matchId: string;
  shareSlug: string;
  matchNumber: string;
  opponentName: string;
  status: string;
  oversLimit: number;
  redWingsBatFirst: boolean;
  resultSummary: string | null;
  innings: ScoringInningsInfo[];
  activeInningsId: string;
  redWingsSquad: SquadPlayerOption[];
  deliveries: DeliveryInput[];
}
