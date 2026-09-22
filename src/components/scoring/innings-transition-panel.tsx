"use client";

import Link from "next/link";
import { InningsBreakSummary } from "@/components/scoring/innings-break-summary";
import type { InningsScoreState } from "@/lib/scoring-engine/types";
import { publicScorecardPath } from "@/lib/match/share-slug";
import { oversFromLegalBalls } from "@/lib/scoring-engine/utils";

interface InningsTransitionPanelProps {
  phase: "innings_complete" | "innings_saved";
  shareSlug: string;
  battingTeamLabel: string;
  inningsNumber: number;
  state: InningsScoreState;
  isController: boolean;
  onSaveInnings: () => Promise<void>;
  onStartSecondInnings: () => Promise<void>;
  savePending?: boolean;
}

export function InningsTransitionPanel({
  phase,
  shareSlug,
  battingTeamLabel,
  inningsNumber,
  state,
  isController,
  onSaveInnings,
  onStartSecondInnings,
  savePending = false,
}: InningsTransitionPanelProps) {
  const firstInnings = inningsNumber === 1;
  const overs = oversFromLegalBalls(state.legalBalls);
  const scorecardHref = publicScorecardPath(shareSlug);

  if (phase === "innings_saved" && firstInnings) {
    return (
      <div className="space-y-3 rounded-xl border border-emerald-600/25 bg-emerald-500/5 p-4 text-sm">
        <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-emerald-800 dark:text-emerald-200">
          1st Innings Saved
        </p>
        <p className="text-lg font-bold tabular-nums">
          {battingTeamLabel} {state.totalRuns}/{state.wickets}
        </p>
        <p className="text-xs tabular-nums text-[var(--rw-muted)]">
          {overs} overs
        </p>
        <div className="flex flex-col gap-2 pt-1">
          <Link
            href={scorecardHref}
            className="rw-focus-ring rw-btn-secondary w-full text-center"
          >
            View 1st Innings Scorecard
          </Link>
          {isController ? (
            <button
              type="button"
              className="rw-focus-ring rw-btn-primary w-full min-h-11"
              onClick={() => void onStartSecondInnings().catch(() => {})}
            >
              Start 2nd Innings
            </button>
          ) : null}
        </div>
      </div>
    );
  }

  if (phase === "innings_complete" && firstInnings) {
    return (
      <div className="space-y-3">
        <InningsBreakSummary
          state={state}
          battingTeamLabel={battingTeamLabel}
          inningsNumber={inningsNumber}
        />
        {isController ? (
          <button
            type="button"
            className="rw-focus-ring rw-btn-primary w-full min-h-11"
            disabled={savePending}
            onClick={() => void onSaveInnings().catch(() => {})}
          >
            {savePending ? "Saving…" : "Save Innings"}
          </button>
        ) : (
          <Link
            href={scorecardHref}
            className="rw-focus-ring rw-btn-secondary block w-full text-center"
          >
            View Scorecard
          </Link>
        )}
      </div>
    );
  }

  return null;
}
