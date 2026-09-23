"use client";

import Link from "next/link";
import { useCallback, useState } from "react";
import { ScoringControlRequestStatus } from "@/components/scoring/scoring-control-request-status";
import type { ScoringSessionStatusHook } from "@/lib/scoring/use-scoring-session-status";
import { cn } from "@/lib/utils/cn";

interface ScoringControlPanelProps {
  slug: string;
  session: ScoringSessionStatusHook;
  className?: string;
  /** On enter-pin page, hide redundant "Enter as scorer" CTA. */
  context?: "enter-pin" | "score";
  onError?: (message: string) => void;
}

export function ScoringControlPanel({
  slug,
  session,
  className,
  context = "score",
  onError,
}: ScoringControlPanelProps) {
  const [requestError, setRequestError] = useState<string | null>(null);

  const requestControl = useCallback(async () => {
    setRequestError(null);
    const result = await session.requestScoringControl();
    if (!result.ok) {
      const msg = result.error ?? "Could not request control.";
      setRequestError(msg);
      onError?.(msg);
    }
  }, [session, onError]);

  const cancelRequest = useCallback(async () => {
    await session.cancelScoringControlRequest();
  }, [session]);

  if (session.loading) return null;

  if (session.scoring_role === "viewer") {
    const pendingOutgoing =
      session.pending_transfer?.direction === "outgoing" ||
      session.requesterUiPhase === "waiting";

    const uiPhase =
      session.requesterUiPhase !== "idle"
        ? session.requesterUiPhase
        : pendingOutgoing
          ? "waiting"
          : "idle";

    return (
      <div className={cn("space-y-3", className)}>
        <ScoringControlRequestStatus
          phase={uiPhase}
          onCancelRequest={
            uiPhase === "waiting" ? () => void cancelRequest() : undefined
          }
        />

        <div className="rounded-2xl border border-[var(--rw-border)] bg-[var(--rw-surface)] px-4 py-4">
          <p className="text-sm font-semibold">
            Scoring controlled by another device
          </p>
          <p className="mt-1 text-xs text-[var(--rw-muted)]">
            You can watch the live score. Request control if you need to continue
            scoring.
          </p>
          <div className="mt-4 flex flex-col gap-2 sm:flex-row">
            <Link
              href={`/live/${slug}`}
              className="rw-focus-ring rw-btn-secondary min-h-10 flex-1 text-center text-sm"
            >
              Watch live
            </Link>
            <button
              type="button"
              disabled={uiPhase === "waiting"}
              onClick={() => void requestControl()}
              className="rw-focus-ring min-h-10 flex-1 rounded-full bg-[var(--rw-primary)] text-sm font-semibold text-white disabled:opacity-50"
            >
              Request Scoring Controls
            </button>
          </div>
        </div>
        {requestError ? (
          <p className="text-sm text-red-600" role="alert">
            {requestError}
          </p>
        ) : null}
      </div>
    );
  }

  if (session.has_active_controller && context !== "enter-pin") {
    return (
      <div
        className={cn(
          "rounded-2xl border border-[var(--rw-border)] bg-[var(--rw-surface)] px-4 py-4",
          className,
        )}
      >
        <p className="text-sm font-semibold">Scoring in progress on another device</p>
        <p className="mt-1 text-xs text-[var(--rw-muted)]">
          Enter the scorer PIN to watch live or request control from another device.
        </p>
        <Link
          href={`/live/${slug}/enter-pin`}
          className="rw-focus-ring rw-btn-primary mt-4 inline-flex min-h-10 w-full items-center justify-center text-sm"
        >
          Enter as scorer
        </Link>
      </div>
    );
  }

  return null;
}
