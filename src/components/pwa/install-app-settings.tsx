"use client";

import { usePwaInstallOptional } from "@/components/pwa/pwa-provider";
import { isStandaloneDisplayMode } from "@/lib/pwa/install-state";

export function InstallAppSettings() {
  const pwa = usePwaInstallOptional();
  if (!pwa) return null;

  if (isStandaloneDisplayMode()) {
    return (
      <p className="text-sm text-[var(--rw-muted)]">
        Red Wings Cricket is installed on this device.
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
      <p className="flex-1 text-sm text-[var(--rw-muted)]">
        Install for quick access and offline scoring on this device.
      </p>
      <button
        type="button"
        className="rw-focus-ring rw-btn-primary shrink-0 min-h-11 px-4"
        onClick={() => pwa.openInstallSheet()}
      >
        Install App
      </button>
    </div>
  );
}
