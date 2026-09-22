import { formatExtrasCompactLines } from "@/lib/scorecard/format-extras-compact";
import type { ScorecardInningsDocument } from "@/lib/scorecard/types";

export function InningsSummaryPanel({ doc }: { doc: ScorecardInningsDocument }) {
  const extrasLines = formatExtrasCompactLines(doc.extrasBreakdown);
  const runRate =
    doc.runRate != null && Number.isFinite(doc.runRate)
      ? doc.runRate.toFixed(1)
      : "—";

  return (
    <div className="grid min-w-0 grid-cols-2 gap-x-4 gap-y-2 border-t border-[var(--rw-border)] px-3 py-3 text-[13px] sm:px-4">
      <div className="min-w-0 space-y-2">
        <p className="tabular-nums text-[var(--rw-text)]">
          <span className="font-semibold">Extras </span>
          <span className="font-bold">{doc.extras}</span>
        </p>
        <p className="tabular-nums">
          <span className="font-semibold text-[var(--rw-primary)]">Total </span>
          <span className="text-base font-bold tabular-nums text-[var(--rw-primary)]">
            {doc.totalRuns}/{doc.wickets}
          </span>
        </p>
        {extrasLines.length > 0 ? (
          <ul className="space-y-0.5 text-[11px] text-[var(--rw-muted)] sm:text-[12px]">
            {extrasLines.map((line) => (
              <li key={line}>{line}</li>
            ))}
          </ul>
        ) : null}
      </div>
      <div className="min-w-0 space-y-2 text-right tabular-nums text-[var(--rw-text)]">
        <p>
          <span className="font-semibold">Overs </span>
          <span className="font-bold">{doc.overs}</span>
        </p>
        <p>
          <span className="font-semibold">Run Rate </span>
          <span className="font-bold">{runRate}</span>
        </p>
        {doc.target != null ? (
          <p className="text-[12px] text-[var(--rw-muted)]">
            Target {doc.target}
          </p>
        ) : null}
      </div>
    </div>
  );
}
