import type { InningsScoreState } from "./types";
import { requiredRunRate, runRate } from "./utils";

export function formatCurrentRunRate(
  totalRuns: number,
  legalBalls: number,
): string {
  if (legalBalls <= 0) return "—";
  const crr = runRate(totalRuns, legalBalls);
  if (!Number.isFinite(crr)) return "—";
  return crr.toFixed(2);
}

export function formatRequiredRunRate(
  runsNeeded: number,
  legalBallsRemaining: number,
): string | null {
  if (runsNeeded <= 0) return "0.00";
  if (legalBallsRemaining <= 0) return null;
  const rrr = requiredRunRate(runsNeeded, legalBallsRemaining);
  if (!Number.isFinite(rrr)) return null;
  return rrr.toFixed(2);
}

export function isChaseInnings(state: InningsScoreState): boolean {
  return state.target != null;
}

export function chaseRunsNeeded(state: InningsScoreState): number | null {
  if (state.target == null) return null;
  return Math.max(state.target - state.totalRuns, 0);
}

export function chaseBallsRemaining(state: InningsScoreState): number {
  const maxBalls = state.oversLimit * 6;
  return Math.max(maxBalls - state.legalBalls, 0);
}

export function isChaseTargetReached(state: InningsScoreState): boolean {
  if (state.target == null || state.deliveries.length === 0) return false;
  return state.totalRuns >= state.target;
}

export function isChaseFailed(state: InningsScoreState): boolean {
  if (state.target == null) return false;
  const maxBalls = state.oversLimit * 6;
  if (state.legalBalls < maxBalls && state.wickets < 10) return false;
  return state.totalRuns < state.target;
}

export interface TopBatterLine {
  key: string;
  name: string;
  runs: number;
  balls: number;
  fours: number;
  sixes: number;
}

export interface TopBowlerLine {
  key: string;
  name: string;
  wickets: number;
  runsConceded: number;
  legalBalls: number;
}

export function topBatters(
  state: InningsScoreState,
  limit = 3,
): TopBatterLine[] {
  return Object.values(state.batters)
    .filter((b) => b.balls > 0 || b.isOut)
    .sort((a, b) => {
      if (b.runs !== a.runs) return b.runs - a.runs;
      if (b.balls !== a.balls) return a.balls - b.balls;
      return a.name.localeCompare(b.name);
    })
    .slice(0, limit)
    .map((b) => ({
      key: b.key,
      name: b.name,
      runs: b.runs,
      balls: b.balls,
      fours: b.fours,
      sixes: b.sixes,
    }));
}

export function topBowlers(
  state: InningsScoreState,
  limit = 3,
): TopBowlerLine[] {
  return Object.values(state.bowlers)
    .filter((b) => b.legalBalls > 0)
    .sort((a, b) => {
      if (b.wickets !== a.wickets) return b.wickets - a.wickets;
      if (a.runsConceded !== b.runsConceded) {
        return a.runsConceded - b.runsConceded;
      }
      return a.name.localeCompare(b.name);
    })
    .slice(0, limit)
    .map((b) => ({
      key: b.key,
      name: b.name,
      wickets: b.wickets,
      runsConceded: b.runsConceded,
      legalBalls: b.legalBalls,
    }));
}

export function bowlerOversDisplay(legalBalls: number): string {
  return `${Math.floor(legalBalls / 6)}.${legalBalls % 6}`;
}
