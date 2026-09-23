"use client";

import { formatTakeoverRequestLine } from "@/lib/scoring/control-display";
import type { PendingTransferState } from "@/lib/scoring/session-status-client";
import { cn } from "@/lib/utils/cn";

function TransferDeviceIcon({ className }: { className?: string }) {
  return (
    <svg
      aria-hidden
      viewBox="0 0 24 24"
      fill="none"
      className={cn("h-9 w-9 text-[var(--rw-primary)]", className)}
    >
      <rect
        x="7"
        y="2"
        width="10"
        height="20"
        rx="2"
        stroke="currentColor"
        strokeWidth="1.5"
      />
      <path
        d="M10 5h4M12 18h.01"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
      <path
        d="M16 12h5M18.5 9.5 21 12l-2.5 2.5"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

interface ScoringTakeoverSheetProps {
  pending?: PendingTransferState | null;
  onGiveControl: () => void;
  onKeepScoring: () => void;
  /** Shown after the controller gave away control (optimistic). */
  transferredAway?: boolean;
}

export function ScoringTakeoverSheet({
  pending,
  onGiveControl,
  onKeepScoring,
  transferredAway = false,
}: ScoringTakeoverSheetProps) {
  if (transferredAway) {
    return (
      <div
        className="pointer-events-none fixed inset-x-0 bottom-0 z-[56] flex justify-center p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] sm:bottom-auto sm:top-20"
        role="status"
      >
        <div className="pointer-events-auto w-full max-w-md rounded-2xl border border-[var(--rw-border)] bg-[var(--rw-surface)] px-4 py-4 shadow-[var(--rw-shadow-md)]">
          <p className="text-sm font-semibold text-[var(--rw-text)]">
            Scoring controls transferred
          </p>
          <p className="mt-1 text-xs leading-relaxed text-[var(--rw-muted)]">
            This device is now view-only. Another device is submitting scoring
            updates.
          </p>
        </div>
      </div>
    );
  }

  const requestLine = formatTakeoverRequestLine(pending?.requester_label);

  return (
    <div
      className="pointer-events-none fixed inset-x-0 bottom-0 z-[56] flex justify-center p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] sm:bottom-auto sm:top-20"
      role="dialog"
      aria-labelledby="scoring-takeover-title"
      aria-describedby="scoring-takeover-desc"
    >
      <div className="pointer-events-auto w-full max-w-md rounded-2xl border border-[var(--rw-border)] bg-[var(--rw-surface)] px-4 py-4 shadow-[var(--rw-shadow-md)]">
        <div className="flex gap-3">
          <TransferDeviceIcon className="shrink-0" />
          <div className="min-w-0 flex-1">
            <p
              id="scoring-takeover-title"
              className="text-sm font-semibold text-[var(--rw-text)]"
            >
              Scoring request
            </p>
            <p
              id="scoring-takeover-desc"
              className="mt-1 text-xs leading-relaxed text-[var(--rw-muted)]"
            >
              Another scorer wants to take over
            </p>
            <p className="mt-2 text-sm leading-snug text-[var(--rw-text)]">
              {requestLine}
            </p>
            <p className="mt-1 text-xs text-[var(--rw-muted)]">
              Give scoring controls to this device? You can keep scoring until
              you choose.
            </p>
          </div>
        </div>

        <div className="mt-4 flex flex-col gap-2">
          <button
            type="button"
            onClick={onGiveControl}
            className="rw-focus-ring min-h-11 w-full rounded-full bg-[var(--rw-primary)] px-4 text-sm font-semibold text-white"
          >
            Give Scoring Controls
          </button>
          <button
            type="button"
            onClick={onKeepScoring}
            className="rw-focus-ring min-h-11 w-full rounded-full border border-[var(--rw-border)] bg-[var(--rw-bg)] px-4 text-sm font-medium text-[var(--rw-text)]"
          >
            Keep Scoring
          </button>
        </div>
      </div>
    </div>
  );
}
