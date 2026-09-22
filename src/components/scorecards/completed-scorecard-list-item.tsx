import Link from "next/link";
import {
  formatCompletedMatchMeta,
  scorecardHrefFromArchive,
  teamInningsScoreLabel,
} from "@/lib/data/completed-scorecard-list-format";
import type { CompletedScorecardSummary } from "@/lib/data/completed-scorecard-list";

export function CompletedScorecardListItem({
  summary,
}: {
  summary: CompletedScorecardSummary;
}) {
  const href = scorecardHrefFromArchive(summary.shareSlug);
  const meta = formatCompletedMatchMeta(summary);

  return (
    <li className="min-w-0">
      <article className="rw-card rw-card-interactive overflow-hidden p-4 sm:p-5">
        <Link href={href} className="rw-focus-ring block min-w-0 space-y-2">
          <p className="text-xs font-semibold uppercase tracking-wide text-[var(--rw-muted)]">
            Red Wings vs {summary.opponentName}
          </p>
          <ul className="space-y-0.5 text-base font-bold tabular-nums tracking-tight sm:text-lg">
            {summary.inningsScores.map((inn) => (
              <li key={inn.inningsNumber} className="break-words">
                {teamInningsScoreLabel(
                  inn.battingTeam,
                  summary.opponentName,
                  inn.totalRuns,
                  inn.wickets,
                )}
              </li>
            ))}
          </ul>
          {summary.resultSummary ? (
            <p className="text-sm font-semibold text-[var(--rw-primary)]">
              {summary.resultSummary}
            </p>
          ) : null}
          {meta ? (
            <p className="text-xs text-[var(--rw-muted)]">{meta}</p>
          ) : null}
        </Link>
        <Link
          href={href}
          className="rw-focus-ring rw-btn-secondary mt-4 inline-block min-h-11 w-full text-center sm:w-auto sm:min-w-[10rem]"
        >
          View Scorecard
        </Link>
      </article>
    </li>
  );
}
