"use client";

import { usePwaInstallOptional } from "@/components/pwa/pwa-provider";

export function InstallAppSettings() {
  const pwa = usePwaInstallOptional();
  if (!pwa) return null;

  if (pwa.standalone) {
    return (
      <p className="text-sm text-[var(--rw-muted)]">
        Red Wings Cricket is installed on this device.
      </p>
    );
  }

  return (
    <p className="text-sm text-[var(--rw-muted)]">
      Red Wings runs as an installed app. Use your browser&apos;s install or
      Add to Home Screen option from the Red Wings install screen.
    </p>
  );
}
