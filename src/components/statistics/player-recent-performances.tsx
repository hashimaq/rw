import Link from "next/link";
import type { PlayerRecentInningsPerformance } from "@/lib/statistics/aggregate-career";
import { publicScorecardPath } from "@/lib/match/share-slug";

interface PlayerRecentPerformancesProps {
  performances: PlayerRecentInningsPerformance[];
}

function formatLine(p: PlayerRecentInningsPerformance): string {
  const parts: string[] = [];
  if (p.batting) {
    const suffix = p.batting.notOut ? "*" : "";
    parts.push(`${p.batting.runs}${suffix} (${p.batting.balls})`);
  }
  if (p.bowling && p.bowling.legalBalls > 0) {
    const overs = Math.floor(p.bowling.legalBalls / 6);
    const balls = p.bowling.legalBalls % 6;
    parts.push(`${p.bowling.wickets}/${p.bowling.runsConceded} (${overs}.${balls})`);
  }
  if (p.catches > 0) parts.push(`${p.catches} ct`);
  return parts.length > 0 ? parts.join(" · ") : "—";
}

export function PlayerRecentPerformances({
  performances,
}: PlayerRecentPerformancesProps) {
  if (performances.length === 0) return null;

  return (
    <section className="min-w-0 rounded-2xl border border-[var(--rw-border)] bg-[var(--rw-surface)] p-5">
      <h2 className="text-lg font-semibold">Recent performances</h2>
      <p className="mt-1 text-sm text-[var(--rw-muted)]">
        Completed matches only — from ball-by-ball records.
      </p>
      <ul className="mt-4 divide-y divide-[var(--rw-border)]">
        {performances.map((p) => {
          const href = p.shareSlug ? publicScorecardPath(p.shareSlug) : null;
          const key = `${p.matchId}-${p.inningsNumber}-${formatLine(p)}`;
          return (
            <li key={key} className="flex min-w-0 flex-col gap-1 py-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="min-w-0">
                <p className="truncate font-medium">
                  {p.matchNumber} vs {p.opponentName}
                </p>
                <p className="text-xs text-[var(--rw-muted)]">
                  {p.matchDate ?? "—"} · Inn {p.inningsNumber}
                </p>
              </div>
              <div className="flex shrink-0 flex-wrap items-center gap-3">
                <span className="text-sm tabular-nums">{formatLine(p)}</span>
                {href ? (
                  <Link
                    href={href}
                    prefetch
                    className="rw-focus-ring text-sm font-semibold text-[var(--rw-primary)]"
                  >
                    Scorecard
                  </Link>
                ) : null}
              </div>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
