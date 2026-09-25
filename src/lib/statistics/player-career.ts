import type { DeliveryInput } from "@/lib/scoring-engine/types";
import { buildInningsStateFromDeliveries } from "@/lib/scoring-engine";
import { economy, strikeRate } from "@/lib/scoring-engine/utils";

export interface PlayerCareerStats {
  playerId: string;
  matches: number;
  innings: number;
  runs: number;
  highestScore: number;
  average: number | null;
  strikeRate: number | null;
  ballsFaced: number;
  fours: number;
  sixes: number;
  ducks: number;
  oversBowled: number;
  maidens: number;
  runsConceded: number;
  wickets: number;
  economy: number | null;
  bestBowling: string | null;
  catches: number;
  wins: number;
  losses: number;
  captaincyMatches: number;
  captaincyWins: number;
  captaincyLosses: number;
}

export function emptyPlayerCareerStats(playerId: string): PlayerCareerStats {
  return {
    playerId,
    matches: 0,
    innings: 0,
    runs: 0,
    highestScore: 0,
    average: null,
    strikeRate: null,
    ballsFaced: 0,
    fours: 0,
    sixes: 0,
    ducks: 0,
    oversBowled: 0,
    maidens: 0,
    runsConceded: 0,
    wickets: 0,
    economy: null,
    bestBowling: null,
    catches: 0,
    wins: 0,
    losses: 0,
    captaincyMatches: 0,
    captaincyWins: 0,
    captaincyLosses: 0,
  };
}

/** Derive batting/bowling totals for one player from one innings' deliveries. */
export function inningsContributionForPlayer(
  playerId: string,
  deliveries: DeliveryInput[],
  oversLimit: number,
) {
  const state = buildInningsStateFromDeliveries(deliveries, oversLimit);
  const batter = Object.values(state.batters).find(
    (b) => b.playerId === playerId,
  );
  const bowler = Object.values(state.bowlers).find(
    (b) => b.playerId === playerId,
  );
  const catches = deliveries.filter(
    (d) =>
      d.isWicket &&
      d.wicketType === "caught" &&
      d.fielderPlayerId === playerId,
  ).length;

  return {
    batting: batter
      ? {
          runs: batter.runs,
          balls: batter.balls,
          fours: batter.fours,
          sixes: batter.sixes,
          strikeRate: strikeRate(batter.runs, batter.balls),
        }
      : null,
    bowling: bowler
      ? {
          legalBalls: bowler.legalBalls,
          runsConceded: bowler.runsConceded,
          wickets: bowler.wickets,
          economy: economy(bowler.runsConceded, bowler.legalBalls),
        }
      : null,
    catches,
  };
}
