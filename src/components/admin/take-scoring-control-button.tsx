"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

interface TakeScoringControlButtonProps {
  matchId: string;
  status: string;
  /** Render as a dropdown menu row instead of a standalone link. */
  menuItem?: boolean;
  onDone?: () => void;
}

export function TakeScoringControlButton({
  matchId,
  status,
  menuItem = false,
  onDone,
}: TakeScoringControlButtonProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  if (status !== "live" && status !== "setup") return null;

  async function onConfirm() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/scoring/release-control", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ match_id: matchId }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(body.error ?? "Could not release scoring control.");
        setLoading(false);
        return;
      }
      setDone(true);
      setOpen(false);
      onDone?.();
      router.refresh();
    } catch {
      setError("Could not release scoring control.");
    } finally {
      setLoading(false);
    }
  }

  const trigger = menuItem ? (
    <button
      type="button"
      onClick={() => setOpen(true)}
      className="rw-focus-ring w-full rounded-lg px-2 py-2.5 text-left text-sm font-medium hover:bg-[var(--rw-surface-hover)]"
    >
      Take scoring control
    </button>
  ) : (
    <button
      type="button"
      onClick={() => setOpen(true)}
      className="rw-focus-ring text-sm font-medium text-red-600 underline-offset-2 hover:underline"
    >
      Take scoring control
    </button>
  );

  return (
    <div className={menuItem ? "" : "flex flex-col items-end gap-2"}>
      {!menuItem && done ? (
        <p className="text-xs text-emerald-600">Scoring control released.</p>
      ) : null}
      {trigger}
      {open ? (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 p-4 sm:items-center"
          role="dialog"
          aria-modal="true"
          aria-labelledby="take-control-title"
        >
          <div className="w-full max-w-md rounded-2xl border border-[var(--rw-border)] bg-[var(--rw-bg)] p-5 shadow-lg">
            <h2 id="take-control-title" className="text-lg font-bold">
              Take scoring control?
            </h2>
            <p className="mt-2 text-sm text-[var(--rw-muted)]">
              This will immediately revoke the current scorer&apos;s control. The
              match will remain live and no scoring data will be deleted.
            </p>
            {error ? (
              <p className="mt-2 text-sm text-red-600" role="alert">
                {error}
              </p>
            ) : null}
            <div className="mt-5 flex flex-wrap gap-2">
              <button
                type="button"
                disabled={loading}
                onClick={() => setOpen(false)}
                className="rw-focus-ring min-h-10 flex-1 rounded-full border border-[var(--rw-border)] text-sm font-medium"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={loading}
                onClick={() => void onConfirm()}
                className="rw-focus-ring min-h-10 flex-1 rounded-full bg-red-600 text-sm font-semibold text-white disabled:opacity-50"
              >
                {loading ? "Working…" : "Take control"}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
