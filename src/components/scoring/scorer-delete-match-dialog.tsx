"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { LiveBadge } from "@/components/ui/live-badge";
import { StatusBadge } from "@/components/ui/status-badge";
import { OverlayPortal } from "@/components/ui/overlay-portal";
import { clearMatchLocalState } from "@/lib/local-db/clear-match-local-state";

export interface ScorerDeleteMatchDialogProps {
  open: boolean;
  onClose: () => void;
  matchId: string;
  matchNumber: string;
  opponentName: string;
  status: string;
  onSuccessToast?: (message: string) => void;
  onErrorToast?: (message: string) => void;
}

export async function requestScorerMatchDelete(matchId: string): Promise<{
  ok: boolean;
  status: number;
  body: { error?: string; code?: string };
}> {
  const res = await fetch(`/api/scoring/matches/${matchId}`, {
    method: "DELETE",
    credentials: "include",
  });
  const body = await res.json().catch(() => ({}));
  return { ok: res.ok, status: res.status, body };
}

export function ScorerDeleteMatchDialog({
  open,
  onClose,
  matchId,
  matchNumber,
  opponentName,
  status,
  onSuccessToast,
  onErrorToast,
}: ScorerDeleteMatchDialogProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isLive = status === "live";

  if (!open) return null;

  function close() {
    if (loading) return;
    setError(null);
    onClose();
  }

  async function confirmDelete() {
    if (loading) return;
    setLoading(true);
    setError(null);

    try {
      const { ok, status: httpStatus, body } =
        await requestScorerMatchDelete(matchId);

      if (httpStatus === 401 || body.code === "session_required") {
        const msg =
          body.error ||
          "Your scorer session expired. Enter the scorer PIN again.";
        setError(msg);
        onErrorToast?.(msg);
        setLoading(false);
        return;
      }
      if (
        httpStatus === 403 ||
        body.code === "not_scoring_controller" ||
        body.code === "match_mismatch"
      ) {
        const msg =
          body.error || "You cannot delete this match from this device.";
        setError(msg);
        onErrorToast?.(msg);
        setLoading(false);
        return;
      }
      if (httpStatus === 404 || body.code === "not_found") {
        const msg = body.error || "Match not found.";
        setError(msg);
        onErrorToast?.(msg);
        setLoading(false);
        return;
      }
      if (httpStatus === 503 || body.code === "audit_config_missing") {
        const msg =
          body.error ||
          "Database needs the scorer delete audit migration. Contact an admin.";
        setError(msg);
        onErrorToast?.(msg);
        setLoading(false);
        return;
      }
      if (!ok) {
        const msg = body.error || "Unable to delete match. Please try again.";
        setError(msg);
        onErrorToast?.(msg);
        setLoading(false);
        return;
      }

      try {
        await clearMatchLocalState(matchId);
      } catch {
        /* server already deleted; best-effort local cleanup */
      }

      setLoading(false);
      onClose();
      onSuccessToast?.("Match deleted. You can start a new match now.");
      router.push("/start-scoring");
      router.refresh();
    } catch {
      const msg = "Unable to delete match. Please try again.";
      setError(msg);
      onErrorToast?.(msg);
      setLoading(false);
    }
  }

  const dialog = (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <button
        type="button"
        className="absolute inset-0 bg-black/45 backdrop-blur-[2px]"
        aria-label="Close delete match dialog"
        onClick={close}
      />
      <div
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="scorer-delete-match-title"
        aria-describedby="scorer-delete-match-desc"
        className="relative w-full max-w-md rounded-2xl border border-[var(--rw-border)] bg-[var(--rw-surface)] p-5 shadow-[var(--rw-shadow-lg)]"
      >
        <h2 id="scorer-delete-match-title" className="text-lg font-semibold">
          Delete match?
        </h2>
        <p
          id="scorer-delete-match-desc"
          className="mt-2 text-sm text-[var(--rw-muted)]"
        >
          This will permanently remove this match and its scoring data. You can
          then start a new match from scratch. This action cannot be undone.
        </p>
        {isLive ? (
          <p className="mt-2 text-sm font-medium text-red-700 dark:text-red-400">
            This live match and its scoring data will be permanently deleted.
          </p>
        ) : null}
        <div className="mt-4 rounded-xl border border-[var(--rw-border)] bg-[var(--rw-surface-hover)]/40 px-4 py-3 text-sm">
          <div className="flex flex-wrap items-center gap-2">
            {isLive ? <LiveBadge /> : <StatusBadge status={status} />}
            <span className="text-xs font-semibold tabular-nums text-[var(--rw-muted)]">
              {matchNumber}
            </span>
          </div>
          <p className="mt-2 font-semibold">
            Red Wings <span className="text-[var(--rw-muted)]">vs</span>{" "}
            {opponentName}
          </p>
        </div>
        {error ? (
          <p className="mt-3 text-sm text-red-600" role="alert">
            {error}
          </p>
        ) : null}
        <div className="mt-4 flex gap-2">
          <button
            type="button"
            className="rw-focus-ring rw-btn-secondary min-h-11 flex-1"
            disabled={loading}
            onClick={close}
          >
            Cancel
          </button>
          <button
            type="button"
            disabled={loading}
            className="rw-focus-ring min-h-11 flex-1 rounded-full bg-red-600 px-4 py-2.5 text-sm font-bold text-white disabled:cursor-not-allowed disabled:opacity-50"
            onClick={() => void confirmDelete()}
          >
            {loading ? "Deleting…" : "Delete Match"}
          </button>
        </div>
      </div>
    </div>
  );

  return <OverlayPortal>{dialog}</OverlayPortal>;
}
