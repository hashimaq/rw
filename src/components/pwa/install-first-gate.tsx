"use client";

import { InstallAppFullScreen } from "@/components/pwa/install-app-fullscreen";
import { usePwaInstallOptional } from "@/components/pwa/pwa-provider";

/**
 * Install-first gate: browser users see only the install screen until the PWA
 * runs in standalone mode (or dev bypass is active).
 */
export function InstallFirstGate({ children }: { children: React.ReactNode }) {
  const pwa = usePwaInstallOptional();

  if (!pwa) return children;

  if (!pwa.hydrated && !pwa.appUnlocked) {
    return <InstallAppFullScreen />;
  }

  if (!pwa.appUnlocked) {
    return <InstallAppFullScreen />;
  }

  return children;
}
