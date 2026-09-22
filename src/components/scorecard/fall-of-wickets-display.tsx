import type { ScorecardInningsDocument } from "@/lib/scorecard/types";

export function FallOfWicketsDisplay({
  fallOfWickets,
}: {
  fallOfWickets: ScorecardInningsDocument["fallOfWickets"];
}) {
  if (fallOfWickets.length === 0) return null;

  return (
    <p className="min-w-0 break-words px-3 py-3 text-[13px] leading-relaxed text-[var(--rw-muted)] sm:px-4">
      {fallOfWickets.map((f, i) => (
        <span key={f.wicketNumber}>
          {i > 0 ? ", " : null}
          {f.score}-{f.wicketNumber} (
          <span className="font-semibold text-[var(--rw-primary)]">
            {f.batter}
          </span>
          , {f.over})
        </span>
      ))}
    </p>
  );
}
