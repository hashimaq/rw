"use client";

import { useState } from "react";
import { MatchAiAutoRefresh } from "@/components/scorecard/match-ai-auto-refresh";
import { MatchScorecardHeader } from "@/components/scorecard/match-scorecard-header";
import { MatchPerformanceTab } from "@/components/scorecard/match-performance-tab";
import { ManOfTheMatchSection } from "@/components/scorecard/man-of-the-match-section";
import { ScorecardDownloadLink } from "@/components/scorecard/scorecard-download-link";
import { ScorecardInningsSelector } from "@/components/scorecard/scorecard-innings-selector";
import type { FullMatchScorecardData } from "@/lib/scorecard/types";
import { cn } from "@/lib/utils/cn";

type MainTab = "overview" | "scorecard" | "performance";

const TAB_LABELS: { id: MainTab; label: string }[] = [
  { id: "overview", label: "Overview" },
  { id: "scorecard", label: "Scorecard" },
  { id: "performance", label: "Performance" },
];

export function MatchScorecardTabs({ data }: { data: FullMatchScorecardData }) {
  const [tab, setTab] = useState<MainTab>("overview");
  const completed = data.status === "completed";

  return (
    <article className="mx-auto min-w-0 w-full max-w-3xl space-y-5">
      <MatchAiAutoRefresh
        aiAnalysis={data.aiAnalysis}
        enabled={completed}
      />
      <MatchScorecardHeader data={data} />

      <div
        className="grid min-w-0 grid-cols-3 gap-1 rounded-xl border border-[var(--rw-border)] bg-[var(--rw-surface-hover)] p-1"
        role="tablist"
        aria-label="Match Centre sections"
      >
        {TAB_LABELS.map(({ id, label }) => {
          const active = tab === id;
          return (
            <button
              key={id}
              type="button"
              role="tab"
              aria-selected={active}
              className={cn(
                "rw-focus-ring min-w-0 rounded-lg px-2 py-2.5 text-center text-xs font-semibold sm:text-sm",
                active
                  ? "bg-[var(--rw-primary)] text-white shadow-sm"
                  : "text-[var(--rw-text)] hover:bg-[var(--rw-surface)]",
              )}
              onClick={() => setTab(id)}
            >
              {label}
            </button>
          );
        })}
      </div>

      <div role="tabpanel" className="min-w-0 space-y-6">
        {tab === "overview" ? (
          <>
            {completed && data.shareSlug ? (
              <ScorecardDownloadLink shareSlug={data.shareSlug} />
            ) : null}
            {completed ? (
              <ManOfTheMatchSection
                display={data.playerOfTheMatch}
                aiAnalysis={data.aiAnalysis}
              />
            ) : null}
            <ScorecardInningsSelector data={data} />
          </>
        ) : null}

        {tab === "scorecard" ? (
          <ScorecardInningsSelector data={data} />
        ) : null}

        {tab === "performance" && completed ? (
          <MatchPerformanceTab data={data} />
        ) : null}

        {tab === "performance" && !completed ? (
          <p className="text-sm text-[var(--rw-muted)]">
            Performance analysis is available after the match is completed.
          </p>
        ) : null}
      </div>
    </article>
  );
}
