import { RedWingsLogo } from "@/components/branding/red-wings-logo";
import { ScorecardTemplateBar } from "@/components/scorecard/scorecard-template-bar";
import type { FullMatchScorecardData } from "@/lib/scorecard/types";

function formatDate(iso: string | null): string | null {
  if (!iso) return null;
  try {
    return new Intl.DateTimeFormat(undefined, {
      dateStyle: "medium",
    }).format(new Date(iso));
  } catch {
    return iso;
  }
}

export function MatchScorecardHeader({
  data,
}: {
  data: FullMatchScorecardData;
}) {
  const doc = data.document;
  const date = formatDate(doc.matchDate);

  const competition =
    doc.tournamentName ?? doc.seriesName ?? null;

  const metaLine = [
    doc.matchNumber,
    date,
    doc.venue,
    competition,
  ]
    .filter(Boolean)
    .join(" · ");

  return (
    <header className="overflow-hidden rounded-lg border border-[var(--rw-border)] bg-[var(--rw-surface)]">
      <div className="flex flex-wrap items-center gap-3 border-b border-[var(--rw-border)] px-3 py-3 sm:px-4">
        <RedWingsLogo size={44} variant="header" priority />
        <div className="min-w-0 flex-1">
          <p className="text-[10px] font-bold tracking-[0.2em] text-[var(--rw-muted)]">
            RED WINGS CRICKET
          </p>
          <h1 className="mt-0.5 text-lg font-bold leading-snug sm:text-xl">
            Red Wings{" "}
            <span className="font-normal text-[var(--rw-muted)]">vs</span>{" "}
            {doc.opponent}
          </h1>
        </div>
      </div>

      {metaLine ? (
        <p className="min-w-0 break-words border-b border-[var(--rw-border)] px-3 py-2 text-[13px] text-[var(--rw-muted)] sm:px-4">
          {metaLine}
        </p>
      ) : null}

      {doc.tossSummary ? (
        <p className="border-b border-[var(--rw-border)] px-3 py-2 text-[13px] text-[var(--rw-text)] sm:px-4">
          {doc.tossSummary}
        </p>
      ) : null}

      {data.status === "completed" && doc.resultSummary ? (
        <ScorecardTemplateBar>
          <p className="min-w-0 break-words">
            <span className="text-[var(--rw-muted)]">Result — </span>
            <span className="text-[var(--rw-primary)]">{doc.resultSummary}</span>
          </p>
        </ScorecardTemplateBar>
      ) : null}
    </header>
  );
}
