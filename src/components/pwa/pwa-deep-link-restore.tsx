"use client";

import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef } from "react";
import { usePwaInstallOptional } from "@/components/pwa/pwa-provider";
import {
  PWA_INTENDED_PATH_KEY,
  isInstallFirstGateEnabled,
} from "@/lib/pwa/install-first-gate";

/** Preserve deep links across browser install gate → installed PWA launch. */
export function PwaDeepLinkRestore() {
  const pwa = usePwaInstallOptional();
  const pathname = usePathname();
  const router = useRouter();
  const restored = useRef(false);

  useEffect(() => {
    if (!isInstallFirstGateEnabled() || !pwa) return;

    const fullPath =
      pathname + window.location.search + window.location.hash;

    if (!pwa.appUnlocked) {
      try {
        sessionStorage.setItem(PWA_INTENDED_PATH_KEY, fullPath);
      } catch {
        /* ignore */
      }
      return;
    }

    if (restored.current || !pwa.standalone) return;

    try {
      const intended = sessionStorage.getItem(PWA_INTENDED_PATH_KEY);
      sessionStorage.removeItem(PWA_INTENDED_PATH_KEY);
      if (intended && intended !== fullPath) {
        restored.current = true;
        router.replace(intended);
      }
    } catch {
      /* ignore */
    }
  }, [pwa, pathname, router]);

  return null;
}
