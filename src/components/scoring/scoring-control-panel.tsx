"use client";

import Link from "next/link";
import { useCallback, useState } from "react";
import type { ScoringSessionStatusState } from "@/lib/scoring/use-scoring-session-status";
import { cn } from "@/lib/utils/cn";

interface ScoringControlPanelProps {
  slug: string;
  matchId: string;
  status: ScoringSessionStatusState;
  onRefresh: () => Promise<void>;
  className?: string;
}

export function ScoringControlPanel({
  slug,
  matchId,
  status,
  onRefresh,
  className,
}: ScoringControlPanelProps) {
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [confirmTransfer, setConfirmTransfer] = useState(false);

  const requestControl = useCallback(async () => {
    setBusy("request");
    setError(null);
    try {
      const res = await fetch("/api/scoring/control/request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ match_id: matchId }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(body.error ?? "Could not request control.");
        return;
      }
      await onRefresh();
    } finally {
      setBusy(null);
    }
  }, [matchId, onRefresh]);

  const respondTransfer = useCallback(
    async (action: "keep" | "transfer") => {
      const transferId = status.pending_transfer?.id;
      if (!transferId) return;
      setBusy(action);
      setError(null);
      try {
        const res = await fetch("/api/scoring/control/respond", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({
            match_id: matchId,
            transfer_id: transferId,
            action,
          }),
        });
        const body = await res.json().catch(() => ({}));
        if (!res.ok) {
          setError(body.error ?? "Could not update transfer.");
          return;
        }
        setConfirmTransfer(false);
        await onRefresh();
      } finally {
        setBusy(null);
      }
    },
    [matchId, onRefresh, status.pending_transfer?.id],
  );

  if (status.loading) return null;

  if (status.scoring_role === "controller") {
    return (
      <div className={cn("space-y-3", className)}>
        <div className="rounded-2xl border border-emerald-500/35 bg-emerald-500/10 px-4 py-3">
          <p className="text-sm font-semibold text-[var(--rw-text)]">
            Scoring control active
          </p>
          <p className="mt-1 text-xs text-[var(--rw-muted)]">
            This device is the only one allowed to submit scoring updates.
          </p>
        </div>

        {status.pending_transfer?.direction === "incoming" ? (
          <div
            className="rounded-2xl border border-amber-500/40 bg-amber-500/10 px-4 py-4"
            role="alert"
          >
            <p className="text-sm font-semibold">Scoring control requested</p>
            <p className="mt-1 text-xs text-[var(--rw-muted)]">
              Another authorized device wants to take over scoring.
            </p>
            {confirmTransfer ? (
              <div className="mt-4 space-y-2">
                <p className="text-xs text-[var(--rw-muted)]">
                  Transfer scoring control? The other device will become the only
                  device allowed to submit scoring updates.
                </p>
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    disabled={busy !== null}
                    onClick={() => void respondTransfer("transfer")}
                    className="rw-focus-ring min-h-10 rounded-full bg-[var(--rw-primary)] px-4 text-sm font-semibold text-white disabled:opacity-50"
                  >
                    {busy === "transfer" ? "Transferring…" : "Transfer control"}
                  </button>
                  <button
                    type="button"
                    disabled={busy !== null}
                    onClick={() => setConfirmTransfer(false)}
                    className="rw-focus-ring min-h-10 rounded-full border border-[var(--rw-border)] px-4 text-sm font-medium"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <div className="mt-4 flex flex-wrap gap-2">
                <button
                  type="button"
                  disabled={busy !== null}
                  onClick={() => void respondTransfer("keep")}
                  className="rw-focus-ring min-h-10 rounded-full border border-[var(--rw-border)] px-4 text-sm font-medium disabled:opacity-50"
                >
                  {busy === "keep" ? "…" : "Keep control"}
                </button>
                <button
                  type="button"
                  disabled={busy !== null}
                  onClick={() => setConfirmTransfer(true)}
                  className="rw-focus-ring min-h-10 rounded-full border border-[var(--rw-border)] px-4 text-sm font-medium disabled:opacity-50"
                >
                  Transfer control
                </button>
              </div>
            )}
          </div>
        ) : (
          <p className="text-xs text-[var(--rw-muted)]">
            To transfer scoring, another authorized device must request control. You
            can approve the request here when it arrives.
          </p>
        )}

        {error ? (
          <p className="text-sm text-red-600" role="alert">
            {error}
          </p>
        ) : null}
      </div>
    );
  }

  if (status.scoring_role === "viewer") {
    const pendingOutgoing =
      status.pending_transfer?.direction === "outgoing";

    return (
      <div className={cn("space-y-3", className)}>
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
              disabled={busy !== null || pendingOutgoing}
              onClick={() => void requestControl()}
              className="rw-focus-ring min-h-10 flex-1 rounded-full bg-[var(--rw-primary)] text-sm font-semibold text-white disabled:opacity-50"
            >
              {pendingOutgoing
                ? "Request pending…"
                : busy === "request"
                  ? "Requesting…"
                  : "Request scoring control"}
            </button>
          </div>
        </div>
        {error ? (
          <p className="text-sm text-red-600" role="alert">
            {error}
          </p>
        ) : null}
      </div>
    );
  }

  if (status.has_active_controller) {
    return (
      <div
        className={cn(
          "rounded-2xl border border-[var(--rw-border)] bg-[var(--rw-surface)] px-4 py-4",
          className,
        )}
      >
        <p className="text-sm font-semibold">Scoring in progress on another device</p>
        <p className="mt-1 text-xs text-[var(--rw-muted)]">
          Enter the scorer PIN to watch live or request control.
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
