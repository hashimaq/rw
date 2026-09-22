import type { ScorecardInningsBuilt } from "@/lib/scorecard/types";
import type { MatchStatus } from "@/lib/database/types";

export type InningsScorecardDisplayState =
  | "live"
  | "completed"
  | "not_started";

export function inningsScorecardDisplayState(
  built: ScorecardInningsBuilt,
): InningsScorecardDisplayState {
  if (built.inningsStatus === "not_started" && built.overByOver.length === 0) {
    return "not_started";
  }
  if (built.inningsStatus === "completed") {
    return "completed";
  }
  return "live";
}

export function inningsStatusBanner(
  built: ScorecardInningsBuilt,
  matchStatus: MatchStatus,
): string {
  const display = inningsScorecardDisplayState(built);
  const ord =
    built.inningsNumber === 1
      ? "1st Innings"
      : built.inningsNumber === 2
        ? "2nd Innings"
        : `${built.inningsNumber}th Innings`;

  if (display === "not_started") {
    return `${ord} — Not Started`;
  }
  if (display === "completed") {
    return `${ord} — Completed`;
  }
  if (matchStatus === "live") {
    return `${ord} — Live`;
  }
  return ord;
}

export function shouldShowSecondInningsPlaceholder(
  innings: ScorecardInningsBuilt[],
  matchStatus: MatchStatus,
): boolean {
  if (innings.length >= 2) return false;
  if (matchStatus !== "live" && matchStatus !== "completed") return false;
  const first = innings[0];
  return first != null && first.inningsStatus === "completed";
}
