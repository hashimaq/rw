import type { BattingSide, TossDecision } from "@/lib/database/types";

export type RedWingsRole = "batting" | "bowling";
export type RedWingsInnings = 1 | 2;

export type InningsInsertPlan =
  | {
      kind: "single";
      inningsNumber: 1;
      battingTeam: BattingSide;
      bowlingTeam: BattingSide;
      status: "not_started";
      target?: null;
    }
  | {
      kind: "second_session";
      completedFirst: {
        inningsNumber: 1;
        battingTeam: BattingSide;
        bowlingTeam: BattingSide;
        totalRuns: number;
        wickets: number;
      };
      activeSecond: {
        inningsNumber: 2;
        battingTeam: BattingSide;
        bowlingTeam: BattingSide;
        target: number;
      };
    };

export function matchMetadataFromSetup(
  role: RedWingsRole,
  innings: RedWingsInnings,
): {
  red_wings_batting_first: boolean;
  toss_winner: BattingSide;
  toss_decision: TossDecision;
} {
  if (innings === 1) {
    if (role === "batting") {
      return {
        red_wings_batting_first: true,
        toss_winner: "red_wings",
        toss_decision: "bat",
      };
    }
    return {
      red_wings_batting_first: false,
      toss_winner: "opponent",
      toss_decision: "bat",
    };
  }
  if (role === "batting") {
    return {
      red_wings_batting_first: false,
      toss_winner: "opponent",
      toss_decision: "bat",
    };
  }
  return {
    red_wings_batting_first: true,
    toss_winner: "red_wings",
    toss_decision: "bat",
  };
}

/** Who batted in the completed 1st innings when starting at 2nd innings. */
export function firstInningsBattingTeam(
  role: RedWingsRole,
  innings: RedWingsInnings,
): BattingSide | null {
  if (innings !== 2) return null;
  if (role === "batting") return "opponent";
  return "red_wings";
}

export function inningsInsertPlan(
  role: RedWingsRole,
  innings: RedWingsInnings,
  firstInningsRuns: number,
  firstInningsWickets: number,
): InningsInsertPlan {
  const target = firstInningsRuns + 1;

  if (innings === 1) {
    if (role === "batting") {
      return {
        kind: "single",
        inningsNumber: 1,
        battingTeam: "red_wings",
        bowlingTeam: "opponent",
        status: "not_started",
      };
    }
    return {
      kind: "single",
      inningsNumber: 1,
      battingTeam: "opponent",
      bowlingTeam: "red_wings",
      status: "not_started",
    };
  }

  if (role === "batting") {
    return {
      kind: "second_session",
      completedFirst: {
        inningsNumber: 1,
        battingTeam: "opponent",
        bowlingTeam: "red_wings",
        totalRuns: firstInningsRuns,
        wickets: firstInningsWickets,
      },
      activeSecond: {
        inningsNumber: 2,
        battingTeam: "red_wings",
        bowlingTeam: "opponent",
        target,
      },
    };
  }

  return {
    kind: "second_session",
    completedFirst: {
      inningsNumber: 1,
      battingTeam: "red_wings",
      bowlingTeam: "opponent",
      totalRuns: firstInningsRuns,
      wickets: firstInningsWickets,
    },
    activeSecond: {
      inningsNumber: 2,
      battingTeam: "opponent",
      bowlingTeam: "red_wings",
      target,
    },
  };
}

export function firstInningsScoreFieldLabel(
  role: RedWingsRole,
  innings: RedWingsInnings,
): string | null {
  if (innings !== 2) return null;
  if (role === "batting") return "Opponent's completed 1st innings";
  return "Red Wings' completed 1st innings";
}
