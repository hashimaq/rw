import { ScorecardTemplateBar } from "@/components/scorecard/scorecard-template-bar";
import type { MatchAiAnalysisView } from "@/lib/ai/match-analysis-types";

function StatCell({ label, value }: { label: string; value: string }) {
  return (
    <div className="text-center">
      <p className="text-lg font-bold tabular-nums text-[var(--rw-text)]">
        {value}
      </p>
      <p className="text-[10px] font-semibold uppercase tracking-wide text-[var(--rw-muted)]">
        {label}
      </p>
    </div>
  );
}

export function PlayerPerformanceSection({
  aiAnalysis,
}: {
  aiAnalysis: MatchAiAnalysisView | undefined;
}) {
  if (!aiAnalysis) return null;

  if (aiAnalysis.state === "unavailable_incomplete") {
    return (
      <section className="overflow-hidden rounded-lg border border-[var(--rw-border)] bg-[var(--rw-surface)]">
        <ScorecardTemplateBar>Player Performance</ScorecardTemplateBar>
        <p className="px-3 py-4 text-sm text-[var(--rw-muted)]">
          AI analysis is limited because complete ball-by-ball data is
          unavailable.
        </p>
      </section>
    );
  }

  if (
    aiAnalysis.state === "pending" ||
    aiAnalysis.state === "processing"
  ) {
    return (
      <section className="overflow-hidden rounded-lg border border-[var(--rw-border)] bg-[var(--rw-surface)]">
        <ScorecardTemplateBar>Player Performance</ScorecardTemplateBar>
        <p className="px-3 py-4 text-sm text-[var(--rw-muted)]">
          AI match analysis is being prepared.
        </p>
      </section>
    );
  }

  if (aiAnalysis.state === "failed" || aiAnalysis.state === "unavailable") {
    return (
      <section className="overflow-hidden rounded-lg border border-[var(--rw-border)] bg-[var(--rw-surface)]">
        <ScorecardTemplateBar>Player Performance</ScorecardTemplateBar>
        <p className="px-3 py-4 text-sm text-[var(--rw-muted)]">
          {aiAnalysis.message}
        </p>
      </section>
    );
  }

  if (aiAnalysis.state !== "ready") {
    return null;
  }

  const readyAnalysis = aiAnalysis;
  const performances = readyAnalysis.playerPerformances;

  return (
    <section className="overflow-hidden rounded-lg border border-[var(--rw-border)] bg-[var(--rw-surface)]">
      <ScorecardTemplateBar>Player Performance</ScorecardTemplateBar>
      <ul className="divide-y divide-[var(--rw-border)]">
        {performances.map((p) => (
          <li key={p.participantKey} className="px-3 py-4 sm:px-4">
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <p className="text-base font-bold text-[var(--rw-primary)]">
                {p.name}
              </p>
              <p className="text-xs font-medium text-[var(--rw-muted)]">
                {p.teamLabel}
              </p>
            </div>
            {p.batting ? (
              <div className="mt-3 grid grid-cols-5 gap-2">
                <StatCell label="Runs" value={String(p.batting.runs)} />
                <StatCell label="Balls" value={String(p.batting.balls)} />
                <StatCell label="4s" value={String(p.batting.fours)} />
                <StatCell label="6s" value={String(p.batting.sixes)} />
                <StatCell
                  label="SR"
                  value={p.batting.strikeRate.toFixed(2)}
                />
              </div>
            ) : null}
            {p.bowling ? (
              <div className="mt-3 grid grid-cols-4 gap-2">
                <StatCell label="Overs" value={p.bowling.overs} />
                <StatCell label="Runs" value={String(p.bowling.runs)} />
                <StatCell label="Wkts" value={String(p.bowling.wickets)} />
                <StatCell
                  label="Eco"
                  value={p.bowling.economy.toFixed(2)}
                />
              </div>
            ) : null}
            {p.aiSummary ? (
              <p className="mt-3 text-[13px] leading-relaxed text-[var(--rw-text)]">
                <span className="font-semibold text-[var(--rw-muted)]">
                  AI Summary:{" "}
                </span>
                {p.aiSummary}
              </p>
            ) : null}
          </li>
        ))}
      </ul>
    </section>
  );
}
