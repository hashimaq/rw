"use client";

import { cn } from "@/lib/utils/cn";

export type ScoringControlRequestUiPhase =
  | "idle"
  | "waiting"
  | "declined"
  | "granted";

interface ScoringControlRequestStatusProps {
  phase: ScoringControlRequestUiPhase;
  onCancelRequest?: () => void;
  className?: string;
}

export function ScoringControlRequestStatus({
  phase,
  onCancelRequest,
  className,
}: ScoringControlRequestStatusProps) {
  if (phase === "idle") return null;

  const message =
    phase === "waiting"
      ? "Waiting for current scorer…"
      : phase === "declined"
        ? "The current scorer kept scoring control."
        : "Scoring controls transferred to this device.";

  return (
    <div
      className={cn(
        "rounded-xl border border-[var(--rw-border)] bg-[var(--rw-surface)] px-3 py-2.5",
        className,
      )}
      role="status"
    >
      <p className="text-xs font-medium text-[var(--rw-text)]">{message}</p>
      {phase === "waiting" && onCancelRequest ? (
        <button
          type="button"
          onClick={onCancelRequest}
          className="rw-focus-ring mt-2 text-[11px] font-semibold text-[var(--rw-primary)]"
        >
          Cancel request
        </button>
      ) : null}
    </div>
  );
}
