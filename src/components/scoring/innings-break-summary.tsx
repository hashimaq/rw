"use client";

import type { InningsScoreState } from "@/lib/scoring-engine/types";
import {
  bowlerOversDisplay,
  formatCurrentRunRate,
  isChaseFailed,
  isChaseInnings,
  isChaseTargetReached,
  topBatters,
  topBowlers,
} from "@/lib/scoring-engine/innings-live";

export function InningsBreakSummary({
  state,
  battingTeamLabel,
  inningsNumber,
}: {
  state: InningsScoreState;
  battingTeamLabel: string;
  inningsNumber: number;
}) {
  const batters = topBatters(state);
  const bowlers = topBowlers(state);
  const chase = isChaseInnings(state);
  const chased = chase && isChaseTargetReached(state);
  const failed = chase && isChaseFailed(state);

  let headline = "INNINGS COMPLETED";
  if (chased) headline = "CHASE COMPLETE";
  else if (failed) headline = "INNINGS COMPLETED";

  const crr = formatCurrentRunRate(state.totalRuns, state.legalBalls);

  return (
    <div className="space-y-3 rounded-xl border border-[var(--rw-border)] bg-[var(--rw-surface)] p-3 text-sm">
      <div>
        <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-[var(--rw-primary)]">
          {headline}
        </p>
        <p className="mt-1 text-lg font-bold tabular-nums">
          {battingTeamLabel} {state.totalRuns}/{state.wickets}
        </p>
        <p className="mt-0.5 text-xs tabular-nums text-[var(--rw-muted)]">
          Innings {inningsNumber} · CRR {crr}
        </p>
        {chase && state.target != null ? (
          <p className="mt-1 text-xs tabular-nums text-[var(--rw-muted)]">
            Target {state.target}
            {failed ? (
              <span>
                {" "}
                · Need {Math.max(state.target - state.totalRuns, 0)}
              </span>
            ) : null}
          </p>
        ) : null}
      </div>

      {batters.length > 0 ? (
        <div>
          <p className="text-[10px] font-bold uppercase tracking-wide text-[var(--rw-muted)]">
            Top batters
          </p>
          <ol className="mt-1.5 space-y-1.5">
            {batters.map((b, i) => (
              <li key={b.key} className="tabular-nums">
                <span className="font-semibold">
                  {i + 1}. {b.name}
                </span>
                <span className="text-[var(--rw-muted)]">
                  {" "}
                  · {b.runs} ({b.balls}) · {b.fours}×4 · {b.sixes}×6
                </span>
              </li>
            ))}
          </ol>
        </div>
      ) : null}

      {bowlers.length > 0 ? (
        <div>
          <p className="text-[10px] font-bold uppercase tracking-wide text-[var(--rw-muted)]">
            Top bowlers
          </p>
          <ol className="mt-1.5 space-y-1.5">
            {bowlers.map((b, i) => (
              <li key={b.key} className="tabular-nums">
                <span className="font-semibold">
                  {i + 1}. {b.name}
                </span>
                <span className="text-[var(--rw-muted)]">
                  {" "}
                  · {b.wickets}/{b.runsConceded} ·{" "}
                  {bowlerOversDisplay(b.legalBalls)} overs
                </span>
              </li>
            ))}
          </ol>
        </div>
      ) : null}
    </div>
  );
}
