import type { Delivery, ExtraType, WicketType } from "@/lib/database/types";

/** Input for recording a ball — before persistence. */
export interface DeliveryInput {
  clientEventId: string;
  sequenceInInnings: number;
  overNumber: number;
  ballNumber: number;
  strikerPlayerId: string | null;
  strikerName: string;
  nonStrikerPlayerId: string | null;
  nonStrikerName: string;
  bowlerPlayerId: string | null;
  bowlerName: string;
  batterRuns: number;
  totalRuns: number;
  extrasRuns: number;
  extraType: ExtraType;
  isLegalDelivery: boolean;
  isBoundary: boolean;
  isSix: boolean;
  isWicket: boolean;
  wicketType: WicketType | null;
  dismissedPlayerId: string | null;
  dismissedPlayerName: string | null;
  fielderPlayerId: string | null;
  fielderName: string | null;
  notes?: string | null;
}

export interface ExtrasBreakdown {
  wides: number;
  noBalls: number;
  byes: number;
  legByes: number;
  penalty: number;
}

export interface BatterInningsStats {
  key: string;
  playerId: string | null;
  name: string;
  runs: number;
  balls: number;
  fours: number;
  sixes: number;
  isOut: boolean;
  dismissalLabel: string | null;
}

export interface BowlerInningsStats {
  key: string;
  playerId: string | null;
  name: string;
  legalBalls: number;
  runsConceded: number;
  wickets: number;
  maidens: number;
  /** Count of wide deliveries bowled (not runs). */
  widesBowled: number;
  /** Count of no-ball deliveries bowled (not runs). */
  noBallsBowled: number;
}

export interface PartnershipState {
  partnershipNumber: number;
  batter1Key: string;
  batter1Name: string;
  batter2Key: string;
  batter2Name: string;
  runs: number;
  balls: number;
  startScore: number;
}

export interface FallOfWicketState {
  wicketNumber: number;
  scoreAtWicket: number;
  dismissedPlayerId: string | null;
  dismissedPlayerName: string;
  overNumber: number;
  ballNumber: number;
}

export interface InningsScoreState {
  totalRuns: number;
  wickets: number;
  legalBalls: number;
  extras: number;
  extrasBreakdown: ExtrasBreakdown;
  strikerKey: string | null;
  nonStrikerKey: string | null;
  currentBowlerKey: string | null;
  batters: Record<string, BatterInningsStats>;
  bowlers: Record<string, BowlerInningsStats>;
  partnerships: PartnershipState[];
  activePartnership: PartnershipState | null;
  fallOfWickets: FallOfWicketState[];
  /** Full innings delivery log (source of truth for undo). */
  deliveries: DeliveryInput[];
  recentDeliveries: DeliveryInput[];
  target: number | null;
  oversLimit: number;
  /** Runs conceded in the current incomplete over (for maidens). */
  runsInCurrentOver: number;
}

export type DeliveryRecord = Delivery | DeliveryInput;
