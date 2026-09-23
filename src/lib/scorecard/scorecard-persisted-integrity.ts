import type { Delivery, InningsRow } from "@/lib/database/types";

/** Completed/scored innings exist but no ball-by-ball rows were persisted. */
export function inningsScoredWithoutDeliveries(
  innings: InningsRow[],
  deliveryRows: Delivery[],
): boolean {
  if (deliveryRows.length > 0) return false;
  return innings.some(
    (i) =>
      i.innings_status === "completed" ||
      (i.total_runs ?? 0) > 0 ||
      (i.wickets ?? 0) > 0,
  );
}

export type InningsTotalSummary = {
  inningsNumber: number;
  battingTeam: InningsRow["batting_team"];
  totalRuns: number;
  wickets: number;
};

export function inningsTotalsSummary(
  innings: InningsRow[],
): InningsTotalSummary[] {
  return innings.map((i) => ({
    inningsNumber: i.innings_number,
    battingTeam: i.batting_team,
    totalRuns: i.total_runs ?? 0,
    wickets: i.wickets ?? 0,
  }));
}

function deliveryTotalsForInnings(
  deliveryRows: Delivery[],
  inningsId: string,
): { runs: number; wickets: number } {
  let runs = 0;
  let wickets = 0;
  for (const row of deliveryRows) {
    if (row.innings_id !== inningsId) continue;
    runs += row.total_runs;
    if (row.is_wicket) wickets += 1;
  }
  return { runs, wickets };
}

/**
 * Completed innings summary disagrees with persisted ball-by-ball rows
 * (e.g. partial sync: stored 48/1 but deliveries sum to 38/1).
 */
export function inningsPersistedTotalsMismatchDeliveries(
  innings: InningsRow[],
  deliveryRows: Delivery[],
): boolean {
  if (deliveryRows.length === 0) return false;

  for (const inn of innings) {
    if (inn.innings_status !== "completed") continue;
    const storedRuns = inn.total_runs ?? 0;
    const storedWickets = inn.wickets ?? 0;
    if (storedRuns === 0 && storedWickets === 0) continue;

    const derived = deliveryTotalsForInnings(deliveryRows, inn.id);
    if (derived.runs !== storedRuns || derived.wickets !== storedWickets) {
      return true;
    }
  }
  return false;
}

/** Any scorecard integrity problem from persisted rows alone. */
export function persistedScorecardDataIncomplete(
  innings: InningsRow[],
  deliveryRows: Delivery[],
): boolean {
  return (
    inningsScoredWithoutDeliveries(innings, deliveryRows) ||
    inningsPersistedTotalsMismatchDeliveries(innings, deliveryRows)
  );
}
