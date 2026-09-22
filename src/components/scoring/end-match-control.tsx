"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { cn } from "@/lib/utils/cn";

interface EndMatchControlProps {
  className?: string;
}

export function EndMatchControl({ className }: EndMatchControlProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [pin, setPin] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  function close() {
    if (submitting) return;
    setOpen(false);
    setPin("");
    setError(null);
  }

  async function confirmEnd(e: React.FormEvent) {
    e.preventDefault();
    if (submitting || pin.length !== 4) return;
    setSubmitting(true);
    setError(null);

    try {
      const res = await fetch("/api/scoring/end-match", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ pin }),
      });
      const body = await res.json().catch(() => ({}));

      if (res.status === 401) {
        setError("Incorrect scorer PIN");
        setSubmitting(false);
        return;
      }
      if (res.status === 409) {
        setError("This match has already been finalized.");
        setSubmitting(false);
        return;
      }
      if (!res.ok) {
        setError(body.error || "Could not end match.");
        setSubmitting(false);
        return;
      }

      router.push(body.share_slug ? `/live/${body.share_slug}/score` : "/matches");
      router.refresh();
    } catch {
      setError("Could not end match. Try again.");
      setSubmitting(false);
    }
  }

  return (
    <>
      <button
        type="button"
        className={cn(
          "rw-focus-ring rounded-full border border-red-500/35 bg-red-500/5 px-4 py-2 text-xs font-semibold text-red-700 transition-colors hover:bg-red-500/10 dark:text-red-400",
          className,
        )}
        onClick={() => setOpen(true)}
      >
        End Match
      </button>

      {open ? (
        <div className="fixed inset-0 z-50 flex items-end justify-center p-4 sm:items-center">
          <button
            type="button"
            className="absolute inset-0 bg-black/45 backdrop-blur-[2px]"
            aria-label="Close end match dialog"
            onClick={close}
          />
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="end-match-title"
            className="relative w-full max-w-md rounded-2xl border border-[var(--rw-border)] bg-[var(--rw-surface)] p-5 shadow-[var(--rw-shadow-lg)]"
          >
            <h2 id="end-match-title" className="text-lg font-semibold">
              End match?
            </h2>
            <p className="mt-2 text-sm text-[var(--rw-muted)]">
              This finalizes the live scoring session and marks the match complete.
              Only continue if the match is actually finished.
            </p>
            <form onSubmit={confirmEnd} className="mt-4 space-y-3">
              <label className="block text-sm">
                <span className="mb-1 block font-medium">Confirm scorer PIN</span>
                <input
                  inputMode="numeric"
                  maxLength={4}
                  required
                  value={pin}
                  onChange={(e) =>
                    setPin(e.target.value.replace(/\D/g, "").slice(0, 4))
                  }
                  className="rw-input w-full text-center text-xl tracking-[0.45em]"
                  autoComplete="off"
                />
              </label>
              {error ? (
                <p className="text-sm text-red-600" role="alert">
                  {error}
                </p>
              ) : null}
              <div className="flex gap-2 pt-1">
                <button
                  type="button"
                  className="rw-focus-ring rw-btn-secondary flex-1"
                  disabled={submitting}
                  onClick={close}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting || pin.length !== 4}
                  className="rw-focus-ring flex-1 rounded-full bg-red-600 px-4 py-2.5 text-sm font-bold text-white disabled:opacity-50"
                >
                  {submitting ? "Ending…" : "End match"}
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}
    </>
  );
}
