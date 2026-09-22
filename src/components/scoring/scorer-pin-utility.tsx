"use client";

import { useEffect, useState } from "react";
import {
  readRememberedScorerPin,
} from "@/lib/scoring/scorer-pin-client";
import { cn } from "@/lib/utils/cn";

function LockIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden
    >
      <path
        d="M7 11V8a5 5 0 0110 0v3M6 11h12v9H6z"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

interface ScorerPinUtilityProps {
  slug: string;
  className?: string;
}

/** Shown only when parent has verified an active scorer session server-side. */
export function ScorerPinUtility({ slug, className }: ScorerPinUtilityProps) {
  const [revealed, setRevealed] = useState(false);
  const [pin, setPin] = useState<string | null>(null);

  useEffect(() => {
    setPin(readRememberedScorerPin(slug));
  }, [slug]);

  if (!pin) {
    return (
      <div
        className={cn(
          "flex flex-wrap items-center gap-2 rounded-full border border-[var(--rw-border)] bg-[var(--rw-surface)] px-3 py-2 text-xs text-[var(--rw-muted)]",
          className,
        )}
      >
        <LockIcon className="h-4 w-4 shrink-0 opacity-80" />
        <span className="font-semibold tracking-wide">Scorer PIN</span>
        <span>Enter PIN on this device to reveal it here.</span>
      </div>
    );
  }

  return (
    <div
      className={cn(
        "flex flex-wrap items-center gap-2 rounded-full border border-[var(--rw-border)] bg-[var(--rw-surface)] px-3 py-2 text-xs shadow-sm",
        className,
      )}
    >
      <LockIcon className="h-4 w-4 shrink-0 text-[var(--rw-primary)]" />
      <span className="font-semibold tracking-wide text-[var(--rw-muted)]">
        Scorer PIN
      </span>
      <span
        className="min-w-[2.5rem] font-mono text-sm font-bold tabular-nums tracking-widest text-[var(--rw-text)]"
        aria-live="polite"
      >
        {revealed ? pin : "••••"}
      </span>
      <button
        type="button"
        className="rw-focus-ring rounded-full px-2.5 py-1 font-semibold text-[var(--rw-primary)] hover:bg-red-500/10"
        onClick={() => setRevealed((v) => !v)}
        aria-pressed={revealed}
      >
        {revealed ? "Hide" : "Show PIN"}
      </button>
    </div>
  );
}
