"use client";

import Link from "next/link";
import { ScorecardDownloadLink } from "@/components/scorecard/scorecard-download-link";
import type { ScoringInningsInfo } from "@/lib/data/scoring-bootstrap";
import type { BattingSide } from "@/lib/database/types";
import { publicScorecardPath } from "@/lib/match/share-slug";

function teamLabel(team: BattingSide, opponentName: string): string {
  return team === "red_wings" ? "Red Wings" : opponentName;
}

export function MatchCompleteSummary({
  shareSlug,
  opponentName,
  innings,
  resultSummary,
}: {
  shareSlug: string;
  opponentName: string;
  innings: ScoringInningsInfo[];
  resultSummary: string | null;
}) {
  const sorted = [...innings].sort((a, b) => a.inningsNumber - b.inningsNumber);

  return (
    <div className="space-y-3 rounded-xl border border-emerald-600/30 bg-emerald-500/10 p-4 text-sm">
      <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-emerald-800 dark:text-emerald-200">
        Match Completed
      </p>
      <ul className="space-y-1.5 tabular-nums">
        {sorted.map((inn) => (
          <li key={inn.id} className="font-semibold tabular-nums">
            {teamLabel(inn.battingTeam, opponentName)}{" "}
            {inn.totalRuns}/{inn.wickets}
          </li>
        ))}
      </ul>
      {resultSummary ? (
        <p className="text-base font-bold uppercase tracking-wide text-[var(--rw-primary)]">
          {resultSummary}
        </p>
      ) : null}
      <ScorecardDownloadLink shareSlug={shareSlug} />
      <Link
        href={publicScorecardPath(shareSlug)}
        prefetch
        className="rw-focus-ring rw-btn-primary mt-1 block w-full text-center"
      >
        View Complete Scorecard
      </Link>
    </div>
  );
}
