"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import type { ScoringBootstrap } from "@/lib/data/scoring-bootstrap-types";
import {
  loadScoringBootstrapCacheBySlug,
  saveScoringBootstrapCache,
} from "@/lib/local-db/scoring-bootstrap-cache";
import { BackButton } from "@/components/ui/back-button";
import { publicScorecardPath } from "@/lib/match/share-slug";
import { BallScoringPanel } from "@/components/scoring/ball-scoring-panel";
import { ScorerMatchOptionsMenu } from "@/components/scoring/scorer-match-options-menu";
import { ScorerPinUtility } from "@/components/scoring/scorer-pin-utility";
import { useScoringSessionStatus } from "@/lib/scoring/use-scoring-session-status";
import { cn } from "@/lib/utils/cn";

interface LiveScoreScreenProps {
  slug: string;
  matchId: string;
  matchNumber: string;
  opponentName: string;
  status: string;
  oversLabel?: string | null;
  bootstrap: ScoringBootstrap | null;
}

export function LiveScoreScreen({
  slug,
  matchId,
  matchNumber,
  opponentName,
  status,
  bootstrap,
}: LiveScoreScreenProps) {
  const session = useScoringSessionStatus(slug, matchId);
  const [resolvedBootstrap, setResolvedBootstrap] =
    useState<ScoringBootstrap | null>(bootstrap);

  useEffect(() => {
    if (bootstrap) {
      setResolvedBootstrap(bootstrap);
      void saveScoringBootstrapCache(bootstrap);
      return;
    }
    let cancelled = false;
    void loadScoringBootstrapCacheBySlug(slug).then((cached) => {
      if (!cancelled && cached) setResolvedBootstrap(cached);
    });
    return () => {
      cancelled = true;
    };
  }, [bootstrap, slug]);

  const live = status === "live";
  const completed = status === "completed";
  const isController = session.scoring_role === "controller";
  const [offline, setOffline] = useState(false);
  const [toast, setToast] = useState<{
    message: string;
    variant: "success" | "error";
  } | null>(null);

  useEffect(() => {
    const sync = () => setOffline(!navigator.onLine);
    window.addEventListener("online", sync);
    window.addEventListener("offline", sync);
    sync();
    return () => {
      window.removeEventListener("online", sync);
      window.removeEventListener("offline", sync);
    };
  }, []);

  const showSuccessToast = useCallback((message: string) => {
    setToast({ message, variant: "success" });
    window.setTimeout(() => setToast(null), 4000);
  }, []);

  const showErrorToast = useCallback((message: string) => {
    setToast({ message, variant: "error" });
    window.setTimeout(() => setToast(null), 5000);
  }, []);

  return (
    <main className="mx-auto flex min-h-dvh max-w-lg flex-col bg-[var(--rw-bg)] text-[var(--rw-text)]">
      <header className="sticky top-0 z-30 border-b border-[var(--rw-border)] bg-[var(--rw-bg)]/95 backdrop-blur-md">
        <div className="flex items-center gap-2 px-3 py-2">
          <BackButton
            href={`/live/${slug}`}
            ariaLabel="Back to match centre"
            iconOnly
            className="shrink-0"
          />
          <div className="min-w-0 flex-1">
            <h1 className="text-[17px] font-semibold tracking-tight">
              Match Centre
            </h1>
            {live ? (
              <p className="text-[10px] font-bold uppercase tracking-wide text-[var(--rw-primary)]">
                Live
              </p>
            ) : completed ? (
              <p className="text-[10px] font-bold uppercase tracking-wide text-[var(--rw-muted)]">
                Match complete
              </p>
            ) : null}
          </div>
          <div className="flex shrink-0 items-center gap-1">
            <Link
              href={publicScorecardPath(slug)}
              className="rw-focus-ring rounded-full border border-[var(--rw-border)] px-2.5 py-1.5 text-[11px] font-semibold text-[var(--rw-primary)]"
            >
              Scorecard
            </Link>
            {isController ? (
              <>
                <ScorerMatchOptionsMenu
                  matchId={matchId}
                  matchNumber={matchNumber}
                  opponentName={opponentName}
                  status={status}
                  onSuccessToast={showSuccessToast}
                  onErrorToast={showErrorToast}
                />
                <ScorerPinUtility slug={slug} className="max-w-[9.5rem] !px-2 !py-1" />
              </>
            ) : null}
          </div>
        </div>
      </header>

      {resolvedBootstrap ? (
        <BallScoringPanel
          bootstrap={resolvedBootstrap}
          isController={isController}
        />
      ) : (
        <div className="m-4 rounded-2xl border border-[var(--rw-border)] p-6 text-center">
          <p className="text-sm text-[var(--rw-muted)]">
            {offline
              ? "Reconnect once to load this match, or reopen the scoring page you used while online."
              : "Score unavailable."}
          </p>
        </div>
      )}

      {session.scoring_role === "viewer" && session.has_active_controller ? (
        <p className="mx-4 mb-4 rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-2.5 text-xs text-[var(--rw-muted)]">
          Scoring control is on another device. This view is read-only.
        </p>
      ) : null}

      {toast ? (
        <div
          role="status"
          className={cn(
            "fixed bottom-4 left-1/2 z-[70] w-[min(100%-2rem,24rem)] -translate-x-1/2 rounded-xl border px-4 py-3 text-sm font-medium shadow-lg",
            toast.variant === "success"
              ? "border-emerald-600/30 bg-emerald-500/10 text-emerald-900 dark:text-emerald-100"
              : "border-red-500/30 bg-red-500/10 text-red-800 dark:text-red-100",
          )}
        >
          {toast.message}
        </div>
      ) : null}
    </main>
  );
}
