"use client";

import { useEffect, useState } from "react";
import { usePwaInstallOptional } from "@/components/pwa/pwa-provider";
import { cn } from "@/lib/utils/cn";

const DISMISS_KEY = "rw-install-banner-dismissed-v1";

function isDismissed(): boolean {
  if (typeof window === "undefined") return true;
  return localStorage.getItem(DISMISS_KEY) === "1";
}

export function InstallAppBanner() {
  const pwa = usePwaInstallOptional();
  const [dismissed, setDismissed] = useState(true);

  useEffect(() => {
    setDismissed(isDismissed());
  }, []);

  if (!pwa?.hydrated || pwa.standalone || dismissed) return null;

  const showBanner =
    pwa.canNativeInstall ||
    pwa.installPromptMode === "ios_manual" ||
    pwa.installPromptMode === "manual_unsupported";

  if (!showBanner) return null;

  const onDismiss = () => {
    localStorage.setItem(DISMISS_KEY, "1");
    setDismissed(true);
  };

  const onInstall = () => {
    void pwa.triggerInstall();
  };

  return (
    <aside
      className={cn(
        "pointer-events-none fixed inset-x-0 z-30 px-3",
        "bottom-[calc(4.25rem+env(safe-area-inset-bottom))] lg:bottom-4",
      )}
      aria-label="Install Red Wings Cricket"
    >
      <div
        className={cn(
          "pointer-events-auto mx-auto flex max-w-lg min-w-0 flex-col gap-3 rounded-2xl",
          "border border-[var(--rw-border)] bg-[var(--rw-surface)] p-4 shadow-[var(--rw-shadow-lg)]",
          "sm:flex-row sm:items-center sm:justify-between",
        )}
      >
        <div className="min-w-0 flex-1">
          <p className="font-semibold text-[var(--rw-text)]">
            Install Red Wings Cricket
          </p>
          <p className="mt-0.5 text-sm text-[var(--rw-muted)]">
            Install the app for the full scoring experience.
          </p>
          {pwa.installPromptMode === "ios_manual" ? (
            <p className="mt-1 text-xs text-[var(--rw-muted)]">
              Safari → Share → Add to Home Screen
            </p>
          ) : null}
        </div>
        <div className="flex shrink-0 flex-wrap gap-2">
          {pwa.canNativeInstall ? (
            <button
              type="button"
              className="rw-focus-ring rw-btn-primary min-h-11 px-4 text-sm font-semibold"
              onClick={onInstall}
            >
              Install App
            </button>
          ) : null}
          <button
            type="button"
            className="rw-focus-ring min-h-11 rounded-xl px-3 text-sm font-medium text-[var(--rw-muted)] hover:bg-[var(--rw-surface-hover)]"
            onClick={onDismiss}
          >
            Not now
          </button>
        </div>
      </div>
    </aside>
  );
}
