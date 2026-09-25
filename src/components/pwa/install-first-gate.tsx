"use client";

import { InstallAppFullScreen } from "@/components/pwa/install-app-fullscreen";
import { usePwaInstallOptional } from "@/components/pwa/pwa-provider";
import { isInstallFirstGateEnabled } from "@/lib/pwa/install-first-gate";

/**
 * PWA-only gate: normal browser tabs see only the full-screen install experience.
 */
export function InstallFirstGate({ children }: { children: React.ReactNode }) {
  const pwa = usePwaInstallOptional();

  if (!isInstallFirstGateEnabled()) {
    return children;
  }

  if (!pwa || !pwa.appUnlocked) {
    return <InstallAppFullScreen />;
  }

  return children;
}
