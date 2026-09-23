import { ScorecardTemplateBar } from "@/components/scorecard/scorecard-template-bar";
import type { MatchAiAnalysisView } from "@/lib/ai/match-analysis-types";
import type { PlayerOfMatchDisplay } from "@/lib/scorecard/player-of-match-display";

export function ManOfTheMatchSection({
  display,
  aiAnalysis,
}: {
  display: PlayerOfMatchDisplay;
  aiAnalysis?: MatchAiAnalysisView;
}) {
  const readyMom =
    aiAnalysis?.state === "ready" ? aiAnalysis.manOfTheMatch : null;
  const playerName =
    readyMom?.name?.trim() || display.name?.trim() || null;
  const narrative =
    readyMom?.narrative?.trim() ||
    readyMom?.reason?.trim() ||
    display.performanceSummary?.trim() ||
    null;

  return (
    <section className="overflow-hidden rounded-xl border border-[var(--rw-border)] bg-[var(--rw-surface)] shadow-sm">
      <ScorecardTemplateBar>AI Man of the Match</ScorecardTemplateBar>
      <div className="px-4 py-5 sm:px-5">
        {readyMom && playerName ? (
          <div className="space-y-3">
            <p className="text-2xl font-bold tracking-tight text-[var(--rw-primary)] sm:text-[26px]">
              {playerName}
            </p>
            {(readyMom.teamLabel ?? display.teamLabel) ? (
              <p className="text-sm font-semibold text-[var(--rw-muted)]">
                {readyMom.teamLabel ?? display.teamLabel}
              </p>
            ) : null}
            {readyMom.batting ? (
              <p className="text-sm font-semibold tabular-nums text-[var(--rw-text)]">
                {readyMom.batting.runs} ({readyMom.batting.balls})
                {readyMom.batting.fours > 0 || readyMom.batting.sixes > 0
                  ? ` · ${readyMom.batting.fours}×4 · ${readyMom.batting.sixes}×6 · SR ${readyMom.batting.strikeRate.toFixed(2)}`
                  : ""}
              </p>
            ) : null}
            {readyMom.bowling && !readyMom.batting ? (
              <p className="text-sm font-semibold tabular-nums text-[var(--rw-text)]">
                {readyMom.bowling.overs} ov · {readyMom.bowling.wickets} wkts ·
                Econ {readyMom.bowling.economy.toFixed(2)}
              </p>
            ) : null}
            {narrative ? (
              <p className="text-[14px] leading-relaxed text-[var(--rw-text)]">
                {narrative}
              </p>
            ) : null}
          </div>
        ) : aiAnalysis?.state === "pending" ||
          aiAnalysis?.state === "processing" ? (
          <p className="text-sm text-[var(--rw-muted)]">
            Preparing performance analysis…
          </p>
        ) : aiAnalysis?.state === "unavailable_incomplete" ? (
          <p className="text-sm text-[var(--rw-muted)]">
            AI analysis is limited because complete ball-by-ball data is
            unavailable.
          </p>
        ) : aiAnalysis?.state === "failed" ||
          aiAnalysis?.state === "unavailable" ? (
          <p className="text-sm text-[var(--rw-muted)]">
            {aiAnalysis.message}
          </p>
        ) : display.assigned && playerName ? (
          <div className="space-y-2">
            <p className="text-2xl font-bold text-[var(--rw-primary)]">
              {playerName}
            </p>
            {display.teamLabel ? (
              <p className="text-sm font-semibold text-[var(--rw-muted)]">
                {display.teamLabel}
              </p>
            ) : null}
            {display.performanceSummary ? (
              <p className="text-[14px] leading-relaxed text-[var(--rw-text)]">
                {display.performanceSummary}
              </p>
            ) : null}
          </div>
        ) : (
          <p className="text-sm text-[var(--rw-muted)]">
            AI Man of the Match analysis is currently unavailable.
          </p>
        )}
      </div>
    </section>
  );
}
