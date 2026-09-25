"use client";

import Link from "next/link";
import { usePwaInstallOptional } from "@/components/pwa/pwa-provider";

export function ScoringInstallRequired({ slug }: { slug: string }) {
  const pwa = usePwaInstallOptional();

  return (
    <main className="mx-auto max-w-lg space-y-6 p-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">
          Install Red Wings Cricket to use Scoring
        </h1>
        <p className="mt-2 text-sm text-[var(--rw-muted)]">
          You can watch live matches and scorecards in the browser. Ball-by-ball
          scoring runs only in the installed app (not a normal browser tab).
        </p>
      </div>

      {pwa?.canNativeInstall ? (
        <button
          type="button"
          className="rw-focus-ring rw-btn-primary w-full min-h-12 text-base font-semibold"
          onClick={() => void pwa.triggerInstall()}
        >
          Install App
        </button>
      ) : null}

      {pwa?.installPromptMode === "ios_manual" ? (
        <p className="rounded-xl border border-[var(--rw-border)] bg-[var(--rw-surface)] p-4 text-sm text-[var(--rw-muted)]">
          On iPhone/iPad: tap <strong>Share</strong> in Safari, then{" "}
          <strong>Add to Home Screen</strong>. Open Red Wings from your home
          screen, then return to scoring.
        </p>
      ) : null}

      {pwa?.installPromptMode === "manual_unsupported" ? (
        <p className="rounded-xl border border-[var(--rw-border)] bg-[var(--rw-surface)] p-4 text-sm text-[var(--rw-muted)]">
          Use Chrome or Edge on desktop/Android, open the menu, and choose{" "}
          <strong>Install app</strong>.
        </p>
      ) : null}

      <Link
        href={`/live/${slug}`}
        prefetch
        className="rw-focus-ring inline-block text-sm font-semibold text-[var(--rw-primary)]"
      >
        Back to live match
      </Link>
    </main>
  );
}
