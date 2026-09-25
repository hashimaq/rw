"use client";

import { InstallAppFullScreen } from "@/components/pwa/install-app-fullscreen";
import { usePwaInstallOptional } from "@/components/pwa/pwa-provider";
import { isInstallFirstGateEnabled } from "@/lib/pwa/install-first-gate";

/**
 * PWA-only gate: normal browser tabs see only the full-screen install experience.
 * App route children are not mounted until standalone/unlocked.
 */
export function InstallFirstGate({ children }: { children: React.ReactNode }) {
  const pwa = usePwaInstallOptional();

  if (!isInstallFirstGateEnabled()) {
    return children;
  }

  if (!pwa?.appUnlocked) {
    return <InstallAppFullScreen />;
  }

  return children;
}
