"use client";

import { ManOfTheMatchSection } from "@/components/scorecard/man-of-the-match-section";
import type { MatchAiAnalysisView } from "@/lib/ai/match-analysis-types";
import type { FullMatchScorecardData } from "@/lib/scorecard/types";
import type { PlayerOfMatchDisplay } from "@/lib/scorecard/player-of-match-display";
import { cn } from "@/lib/utils/cn";

function participationRole(
  participation: "batting" | "bowling" | "batting_and_bowling",
): string {
  if (participation === "batting_and_bowling") return "All-rounder";
  if (participation === "bowling") return "Bowler";
  return "Batter";
}

function StatPill({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0 rounded-lg bg-[var(--rw-surface-hover)] px-2.5 py-2 text-center">
      <p className="truncate text-base font-bold tabular-nums text-[var(--rw-text)]">
        {value}
      </p>
      <p className="text-[10px] font-semibold uppercase tracking-wide text-[var(--rw-muted)]">
        {label}
      </p>
    </div>
  );
}

export function MatchPerformanceTab({
  data,
}: {
  data: FullMatchScorecardData;
}) {
  const aiAnalysis = data.aiAnalysis;
  const display: PlayerOfMatchDisplay = data.playerOfTheMatch;
  const readyMom =
    aiAnalysis?.state === "ready" ? aiAnalysis.manOfTheMatch : null;
  const momKey = readyMom
    ? `${readyMom.playerId ?? ""}:${readyMom.name.trim().toLowerCase()}`
    : null;

  return (
    <div className="min-w-0 space-y-6">
      <header className="space-y-1">
        <h2 className="text-lg font-bold tracking-tight text-[var(--rw-text)]">
          Player Performance
        </h2>
        <p className="text-[13px] leading-relaxed text-[var(--rw-muted)]">
          AI-powered factual analysis based on official match statistics.
        </p>
      </header>

      <ManOfTheMatchSection display={display} aiAnalysis={aiAnalysis} />

      <section className="min-w-0 space-y-4">
        <div className="flex items-baseline justify-between gap-2">
          <h3 className="text-base font-bold text-[var(--rw-text)]">
            All participants
          </h3>
          {aiAnalysis?.state === "ready" ? (
            <p className="text-xs text-[var(--rw-muted)]">
              {aiAnalysis.playerPerformances.length} participants
            </p>
          ) : null}
        </div>

        {!aiAnalysis ? null : aiAnalysis.state === "unavailable_incomplete" ? (
          <p className="text-sm text-[var(--rw-muted)]">
            AI analysis is limited because complete ball-by-ball data is
            unavailable.
          </p>
        ) : aiAnalysis.state === "pending" ||
          aiAnalysis.state === "processing" ? (
          <p className="text-sm text-[var(--rw-muted)]">
            AI performance analysis is being prepared.
          </p>
        ) : aiAnalysis.state === "failed" ||
          aiAnalysis.state === "unavailable" ? (
          <p className="text-sm text-[var(--rw-muted)]">{aiAnalysis.message}</p>
        ) : aiAnalysis.state === "ready" ? (
          <ul className="grid min-w-0 grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3">
            {aiAnalysis.playerPerformances.map((p) => {
              const isMom =
                momKey != null &&
                `${p.playerId ?? ""}:${p.name.trim().toLowerCase()}` ===
                  momKey;
              return (
                <li
                  key={p.participantKey}
                  className={cn(
                    "flex min-w-0 flex-col overflow-hidden rounded-xl border bg-[var(--rw-surface)] shadow-sm",
                    isMom
                      ? "border-[var(--rw-primary)] ring-1 ring-[var(--rw-primary)]/25"
                      : "border-[var(--rw-border)]",
                  )}
                >
                  <div className="border-b border-[var(--rw-border)] px-4 py-3">
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="truncate text-base font-bold text-[var(--rw-primary)]">
                          {p.name}
                        </p>
                        <p className="text-xs font-medium text-[var(--rw-muted)]">
                          {participationRole(p.participation)} · {p.teamLabel}
                        </p>
                      </div>
                      {isMom ? (
                        <span className="shrink-0 rounded-full bg-[var(--rw-primary)] px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-white">
                          AI MoM
                        </span>
                      ) : null}
                    </div>
                  </div>
                  <div className="flex flex-1 flex-col gap-3 px-4 py-3">
                    {p.batting ? (
                      <div className="grid grid-cols-3 gap-2 sm:grid-cols-5">
                        <StatPill label="Runs" value={String(p.batting.runs)} />
                        <StatPill
                          label="Balls"
                          value={String(p.batting.balls)}
                        />
                        <StatPill label="4s" value={String(p.batting.fours)} />
                        <StatPill label="6s" value={String(p.batting.sixes)} />
                        <StatPill
                          label="SR"
                          value={p.batting.strikeRate.toFixed(2)}
                        />
                      </div>
                    ) : null}
                    {p.bowling ? (
                      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                        <StatPill label="Overs" value={p.bowling.overs} />
                        <StatPill
                          label="Runs"
                          value={String(p.bowling.runs)}
                        />
                        <StatPill
                          label="Wkts"
                          value={String(p.bowling.wickets)}
                        />
                        <StatPill
                          label="Econ"
                          value={p.bowling.economy.toFixed(2)}
                        />
                      </div>
                    ) : null}
                    {p.aiSummary ? (
                      <div className="mt-auto border-t border-dashed border-[var(--rw-border)] pt-3">
                        <p className="text-[10px] font-bold uppercase tracking-wide text-[var(--rw-muted)]">
                          AI analysis
                        </p>
                        <p className="mt-1 text-[13px] leading-relaxed text-[var(--rw-text)]">
                          {p.aiSummary}
                        </p>
                      </div>
                    ) : null}
                  </div>
                </li>
              );
            })}
          </ul>
        ) : null}
      </section>
    </div>
  );
}
