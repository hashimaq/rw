"use client";

import { RedWingsLogo } from "@/components/branding/red-wings-logo";
import { PageBackAnchor, SmartBackButton } from "@/components/ui/back-button";
import { LiveBadge } from "@/components/ui/live-badge";
import { ScorerPinUtility } from "@/components/scoring/scorer-pin-utility";

interface LiveScoreViewProps {
  slug: string;
  matchNumber: string;
  opponentName: string;
  status: string;
  oversLabel?: string | null;
  isScorerSession: boolean;
}

export function LiveScoreView({
  slug,
  matchNumber,
  opponentName,
  status,
  oversLabel,
  isScorerSession,
}: LiveScoreViewProps) {
  const live = status === "live";
  const completed = status === "completed";

  return (
    <main className="mx-auto max-w-lg space-y-5 p-6 text-[var(--rw-text)]">
      <PageBackAnchor>
        <SmartBackButton fallbackHref={`/live/${slug}`} />
      </PageBackAnchor>
      <header className="space-y-3">
        <div className="flex items-center gap-3">
          <RedWingsLogo size={40} variant="header" />
          <div className="min-w-0 flex-1">
            <p className="text-xs font-bold tracking-[0.2em] text-[var(--rw-text)]">
              RED WINGS
            </p>
            {live ? (
              <div className="mt-1">
                <LiveBadge />
              </div>
            ) : completed ? (
              <p className="mt-1 text-[10px] font-bold uppercase tracking-wide text-[var(--rw-muted)]">
                Match complete
              </p>
            ) : null}
            <h1 className="mt-1 truncate text-lg font-bold">
              {matchNumber} vs {opponentName}
            </h1>
            {oversLabel ? (
              <p className="text-xs text-[var(--rw-muted)]">{oversLabel}</p>
            ) : null}
          </div>
        </div>
        {isScorerSession ? (
          <div className="flex flex-wrap items-center gap-2">
            <ScorerPinUtility slug={slug} className="min-w-0 flex-1" />
          </div>
        ) : null}
      </header>

      <div className="rounded-2xl border border-[var(--rw-border)] bg-[var(--rw-surface)] p-6 text-center">
        <p className="text-sm text-[var(--rw-muted)]">Current score</p>
        <p className="mt-3 text-4xl font-bold tabular-nums">—</p>
        <p className="mt-2 text-sm text-[var(--rw-muted)]">
          Overs · Striker · Bowler · Ball-by-ball controls ship in Phase 4
        </p>
      </div>

      {isScorerSession ? (
        <p className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-2.5 text-xs text-[var(--rw-muted)]">
          Scoring session active on this device.
        </p>
      ) : null}

    </main>
  );
}
