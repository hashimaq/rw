"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { LiveBadge } from "@/components/ui/live-badge";
import { StatusBadge } from "@/components/ui/status-badge";

export interface DeleteMatchDialogProps {
  open: boolean;
  onClose: () => void;
  matchId: string;
  matchNumber: string;
  opponentName: string;
  status: string;
  onDeleted?: () => void;
  onSuccessToast?: (message: string) => void;
  onErrorToast?: (message: string) => void;
}

export async function requestAdminMatchDelete(matchId: string): Promise<{
  ok: boolean;
  status: number;
  body: { error?: string; code?: string };
}> {
  const res = await fetch(`/api/admin/matches/${matchId}`, {
    method: "DELETE",
    credentials: "include",
  });
  const body = await res.json().catch(() => ({}));
  return { ok: res.ok, status: res.status, body };
}

export function DeleteMatchDialog({
  open,
  onClose,
  matchId,
  matchNumber,
  opponentName,
  status,
  onDeleted,
  onSuccessToast,
  onErrorToast,
}: DeleteMatchDialogProps) {
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
      const { ok, status: httpStatus, body } = await requestAdminMatchDelete(matchId);

      if (httpStatus === 401) {
        const msg = body.error || "Sign in with your admin account.";
        setError(msg);
        onErrorToast?.(msg);
        setLoading(false);
        return;
      }
      if (httpStatus === 403 || body.code === "not_authorized") {
        const msg = body.error || "Admin access required.";
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
          "Database needs the MATCH_DELETED audit migration. Apply it in Supabase, then retry.";
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

      setLoading(false);
      onClose();
      onSuccessToast?.("Match deleted successfully.");
      onDeleted?.();
      if (window.location.pathname.includes("/matches/setup/ready")) {
        router.push("/matches");
      } else {
        router.refresh();
      }
    } catch {
      const msg = "Unable to delete match. Please try again.";
      setError(msg);
      onErrorToast?.(msg);
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-[60] flex items-end justify-center p-4 sm:items-center">
      <button
        type="button"
        className="absolute inset-0 bg-black/45 backdrop-blur-[2px]"
        aria-label="Close delete match dialog"
        onClick={close}
      />
      <div
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="delete-match-title"
        aria-describedby="delete-match-desc"
        className="relative w-full max-w-md rounded-2xl border border-[var(--rw-border)] bg-[var(--rw-surface)] p-5 shadow-[var(--rw-shadow-lg)]"
      >
        <h2 id="delete-match-title" className="text-lg font-semibold">
          Delete match?
        </h2>
        <p id="delete-match-desc" className="mt-2 text-sm text-[var(--rw-muted)]">
          Are you sure you want to delete this match? This will permanently remove
          the match and its match-specific scoring data. This action cannot be undone.
        </p>
        {isLive ? (
          <p className="mt-2 text-sm font-medium text-red-700 dark:text-red-400">
            This is a LIVE match. Deleting it will immediately remove the live
            match and its scoring data.
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
}
