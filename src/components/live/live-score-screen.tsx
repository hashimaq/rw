"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import type { ScoringBootstrap } from "@/lib/data/scoring-bootstrap-types";
import {
  loadScoringBootstrapCacheBySlug,
  saveScoringBootstrapCache,
} from "@/lib/local-db/scoring-bootstrap-cache";
import { BackButton } from "@/components/ui/back-button";
import { publicScorecardPath } from "@/lib/match/share-slug";
import { BallScoringPanel } from "@/components/scoring/ball-scoring-panel";
import { ScorerMatchOptionsMenu } from "@/components/scoring/scorer-match-options-menu";
import { ScoringControlPanel } from "@/components/scoring/scoring-control-panel";
import { ScoringTakeoverSheet } from "@/components/scoring/scoring-takeover-sheet";
import { ScorerPinUtility } from "@/components/scoring/scorer-pin-utility";
import { usePendingDeliveryBackfill } from "@/lib/scoring/use-pending-delivery-backfill";
import { useScoringSessionStatus } from "@/lib/scoring/use-scoring-session-status";
import { cn } from "@/lib/utils/cn";
import { useDeliveryCommentaryPlayback } from "@/lib/commentary/use-delivery-commentary-playback";

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
  const [displayStatus, setDisplayStatus] = useState(status);
  useEffect(() => {
    setDisplayStatus(status);
  }, [status]);

  const session = useScoringSessionStatus(slug, matchId);
  const {
    clearRequesterNotice,
    setTransferredAwayNotice,
    requesterUiPhase,
  } = session;
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

  const live = displayStatus === "live";
  const completed = displayStatus === "completed";
  const isController = session.scoring_role === "controller";
  const isOnline = !offline;
  const backfill = usePendingDeliveryBackfill(
    matchId,
    isController && completed,
    isOnline,
  );
  const showIncomingTakeover =
    isController && session.incomingTransfer != null;
  const showTransferredAway =
    session.transferredAwayNotice && !isController;

  useEffect(() => {
    if (requesterUiPhase !== "granted") return;
    const t = window.setTimeout(() => clearRequesterNotice(), 5000);
    return () => window.clearTimeout(t);
  }, [requesterUiPhase, clearRequesterNotice]);

  useEffect(() => {
    if (!showTransferredAway) return;
    const t = window.setTimeout(() => setTransferredAwayNotice(false), 6000);
    return () => window.clearTimeout(t);
  }, [showTransferredAway, setTransferredAwayNotice]);

  const showSuccessToast = useCallback((message: string) => {
    setToast({ message, variant: "success" });
    window.setTimeout(() => setToast(null), 4000);
  }, []);

  const showErrorToast = useCallback((message: string) => {
    setToast({ message, variant: "error" });
    window.setTimeout(() => setToast(null), 5000);
  }, []);

  /** Frozen when innings loads — must not advance on every re-render (skips current ball). */
  const commentaryBaselineRef = useRef<{
    inningsId: string;
    minSequence: number;
  } | null>(null);
  const activeInningsId = resolvedBootstrap?.activeInningsId ?? null;
  if (
    activeInningsId &&
    resolvedBootstrap &&
    commentaryBaselineRef.current?.inningsId !== activeInningsId
  ) {
    const minSequence =
      resolvedBootstrap.deliveries.length > 0
        ? Math.max(
            ...resolvedBootstrap.deliveries.map((d) => d.sequenceInInnings),
          ) + 1
        : 1;
    commentaryBaselineRef.current = {
      inningsId: activeInningsId,
      minSequence,
    };
  }
  const commentaryMinSequence =
    commentaryBaselineRef.current?.inningsId === activeInningsId
      ? commentaryBaselineRef.current.minSequence
      : 1;

  useDeliveryCommentaryPlayback({
    matchId,
    inningsId: resolvedBootstrap?.activeInningsId ?? null,
    enabled: live && Boolean(resolvedBootstrap?.activeInningsId),
    minSequenceInInnings: commentaryMinSequence,
  });

  return (
    <main className="mx-auto flex min-h-dvh max-w-lg flex-col bg-[var(--rw-bg)] text-[var(--rw-text)]">
      <header className="sticky top-0 z-30 border-b border-[var(--rw-border)] bg-[var(--rw-bg)]/95 backdrop-blur-md">
        <div className="flex flex-col gap-2 px-3 py-2 sm:flex-row sm:items-center sm:gap-3">
          <div className="flex min-w-0 items-center gap-2">
            <BackButton
              href={`/live/${slug}`}
              ariaLabel="Back to match centre"
              iconOnly
              className="shrink-0"
            />
            <div className="min-w-0 flex-1">
              <h1 className="truncate text-[17px] font-semibold tracking-tight">
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
          </div>
          <div className="flex min-w-0 flex-wrap items-center justify-end gap-1.5 sm:ml-auto">
            <Link
              href={publicScorecardPath(slug)}
              className="rw-focus-ring shrink-0 rounded-full border border-[var(--rw-border)] px-2.5 py-1.5 text-[11px] font-semibold text-[var(--rw-primary)]"
            >
              Scorecard
            </Link>
            {isController ? (
              <>
                <ScorerMatchOptionsMenu
                  matchId={matchId}
                  matchNumber={matchNumber}
                  opponentName={opponentName}
                  status={displayStatus}
                  onSuccessToast={showSuccessToast}
                  onErrorToast={showErrorToast}
                />
                <ScorerPinUtility
                  slug={slug}
                  className="max-w-[min(100%,9.5rem)] shrink-0 !px-2 !py-1"
                />
              </>
            ) : null}
          </div>
        </div>
      </header>

      {backfill.pending > 0 ? (
        <div
          className="mx-4 mt-3 rounded-xl border border-amber-600/30 bg-amber-500/10 px-4 py-3 text-xs text-amber-950 dark:text-amber-100"
          role="status"
        >
          {isController ? (
            <>
              {backfill.syncing
                ? "Syncing saved ball-by-ball data to the server…"
                : `${backfill.pending} delivery update(s) waiting to sync.`}
              {backfill.lastError ? (
                <p className="mt-1 font-medium">{backfill.lastError}</p>
              ) : null}
            </>
          ) : (
            <>
              {backfill.pending} local delivery update(s) need to sync. Enter the
              scorer PIN on this device to upload them.
            </>
          )}
        </div>
      ) : null}

      {!isController && session.authorized && !session.loading ? (
        <div className="mx-4 mt-3 min-w-0">
          <ScoringControlPanel
            slug={slug}
            session={session}
            context="score"
            onError={showErrorToast}
          />
        </div>
      ) : null}

      {resolvedBootstrap ? (
        <BallScoringPanel
          bootstrap={resolvedBootstrap}
          isController={isController}
          onMatchStatusChange={setDisplayStatus}
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
        <p className="mx-4 mb-4 rounded-xl border border-[var(--rw-border)] bg-[var(--rw-surface)] px-4 py-2.5 text-xs text-[var(--rw-muted)]">
          Scoring control is on another device. This view is read-only.
        </p>
      ) : null}

      {showIncomingTakeover && session.incomingTransfer ? (
        <ScoringTakeoverSheet
          pending={session.incomingTransfer}
          onKeepScoring={() => {
            void session.respondToTransfer("keep").then((r) => {
              if (!r.ok) showErrorToast(r.error ?? "Could not keep scoring.");
            });
          }}
          onGiveControl={() => {
            void session.respondToTransfer("transfer").then((r) => {
              if (!r.ok) {
                showErrorToast(r.error ?? "Could not transfer control.");
              }
            });
          }}
        />
      ) : null}

      {showTransferredAway ? (
        <ScoringTakeoverSheet
          transferredAway
          onGiveControl={() => {}}
          onKeepScoring={() => {}}
        />
      ) : null}

      {requesterUiPhase === "granted" ? (
        <div
          role="status"
          className="fixed bottom-4 left-1/2 z-[70] w-[min(100%-2rem,24rem)] -translate-x-1/2 rounded-xl border border-emerald-600/30 bg-emerald-500/10 px-4 py-3 text-sm font-medium text-emerald-900 dark:text-emerald-100"
        >
          Scoring controls transferred to this device.
          <button
            type="button"
            className="rw-focus-ring ml-2 text-xs font-semibold underline"
            onClick={() => clearRequesterNotice()}
          >
            Dismiss
          </button>
        </div>
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
