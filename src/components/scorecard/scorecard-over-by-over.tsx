import type { ScorecardOverSummary } from "@/lib/scorecard/types";
import { cn } from "@/lib/utils/cn";

/** Over-by-over ball strip — wraps within viewport (no horizontal scroll). */
export function ScorecardOverByOver({
  overs,
}: {
  overs: ScorecardOverSummary[];
}) {
  if (overs.length === 0) {
    return (
      <p className="px-3 py-3 text-sm text-[var(--rw-muted)] sm:px-4">
        No overs recorded.
      </p>
    );
  }

  return (
    <ol className="divide-y divide-[var(--rw-border)]">
      {overs.map((over) => (
        <li
          key={over.overNumber}
          className="min-w-0 px-3 py-2.5 sm:px-4"
        >
          <div className="flex min-w-0 flex-wrap items-baseline justify-between gap-x-2 gap-y-1">
            <span className="text-[13px] font-semibold tabular-nums text-[var(--rw-text)]">
              Over {over.displayOverNumber}
            </span>
            <span className="text-xs font-medium tabular-nums text-[var(--rw-muted)]">
              {over.runs} run{over.runs === 1 ? "" : "s"}
            </span>
          </div>
          <ul className="mt-1.5 flex min-w-0 flex-wrap gap-1">
            {over.balls.map((ball) => (
              <li key={ball.clientEventId}>
                <span
                  className={cn(
                    "inline-flex min-h-7 min-w-7 max-w-full items-center justify-center border border-[var(--rw-border)] bg-[var(--rw-surface)] px-1 text-[10px] font-semibold tabular-nums text-[var(--rw-text)] sm:text-[11px]",
                    ball.label === "W" || ball.label === "RO"
                      ? "border-[var(--rw-primary)]/40 text-[var(--rw-primary)]"
                      : null,
                  )}
                >
                  {ball.label}
                </span>
              </li>
            ))}
          </ul>
        </li>
      ))}
    </ol>
  );
}
