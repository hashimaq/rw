import type {
  BattingSide,
  Match,
  MatchResult,
  WinMarginType,
} from "@/lib/database/types";

export interface InningsResultInput {
  inningsNumber: number;
  battingTeam: BattingSide;
  totalRuns: number;
  wickets: number;
  /** Chase target for this innings (typically first-innings total + 1). */
  target: number | null;
}

export interface DerivedMatchResult {
  result: MatchResult;
  winner: BattingSide | null;
  winMargin: number | null;
  winMarginType: WinMarginType | null;
  resultSummary: string;
}

function teamDisplayName(
  team: BattingSide,
  opponentName: string,
): string {
  return team === "red_wings" ? "Red Wings" : opponentName;
}

export function formatDerivedResultSummary(
  derived: DerivedMatchResult,
  opponentName: string,
): string {
  if (derived.result === "tie") {
    return "Match tied";
  }
  if (!derived.winner || derived.winMargin == null || !derived.winMarginType) {
    return derived.resultSummary;
  }
  const label = teamDisplayName(derived.winner, opponentName);
  if (derived.winMarginType === "wickets") {
    const w = derived.winMargin;
    return `${label} won by ${w} wicket${w === 1 ? "" : "s"}`;
  }
  const r = derived.winMargin;
  return `${label} won by ${r} run${r === 1 ? "" : "s"}`;
}

/**
 * Derive limited-overs two-innings result from final innings totals.
 * Totals should come from delivery replay when possible.
 */
export function deriveMatchResult(
  innings: InningsResultInput[],
  opponentName: string,
): DerivedMatchResult | null {
  if (innings.length < 2) return null;

  const sorted = [...innings].sort((a, b) => a.inningsNumber - b.inningsNumber);
  const first = sorted[0]!;
  const second = sorted[1]!;

  const firstTotal = first.totalRuns;
  const secondTotal = second.totalRuns;
  const chaseTarget = second.target ?? firstTotal + 1;

  if (secondTotal >= chaseTarget) {
    const wicketsRemaining = Math.max(0, 10 - second.wickets);
    const margin = wicketsRemaining > 0 ? wicketsRemaining : 1;
    const winner = second.battingTeam;
    const derived: DerivedMatchResult = {
      result: winner === "red_wings" ? "red_wings_win" : "opponent_win",
      winner,
      winMargin: margin,
      winMarginType: "wickets",
      resultSummary: "",
    };
    derived.resultSummary = formatDerivedResultSummary(derived, opponentName);
    return derived;
  }

  if (secondTotal === firstTotal) {
    return {
      result: "tie",
      winner: null,
      winMargin: null,
      winMarginType: null,
      resultSummary: "Match tied",
    };
  }

  const winner = first.battingTeam;
  const margin = firstTotal - secondTotal;
  if (margin <= 0) {
    return null;
  }

  const derived: DerivedMatchResult = {
    result: winner === "red_wings" ? "red_wings_win" : "opponent_win",
    winner,
    winMargin: margin,
    winMarginType: "runs",
    resultSummary: "",
  };
  derived.resultSummary = formatDerivedResultSummary(derived, opponentName);
  return derived;
}

/** Human-readable summary from persisted match columns. */
export function resultSummaryFromPersistedMatch(
  match: Pick<
    Match,
    "result" | "winner" | "win_margin" | "win_margin_type" | "opponent_name"
  >,
): string | null {
  if (!match.result) return null;
  if (match.result === "tie") return "Match tied";
  if (!match.winner || match.win_margin == null || !match.win_margin_type) {
    return null;
  }
  return formatDerivedResultSummary(
    {
      result: match.result,
      winner: match.winner,
      winMargin: match.win_margin,
      winMarginType: match.win_margin_type,
      resultSummary: "",
    },
    match.opponent_name,
  );
}
