"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import {
  isBrowserAppBypassAllowed,
  isInstallFirstGateEnabled,
  isIosDevice,
  isRedWingsAppUnlocked,
  isStandaloneDisplayMode,
  resolveInstallPromptMode,
  type InstallPromptMode,
} from "@/lib/pwa/install-first-gate";
import { syncScoringSurfaceCookie } from "@/lib/pwa/scoring-surface-cookie";

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

function isAndroidDevice(): boolean {
  if (typeof navigator === "undefined") return false;
  return /android/i.test(navigator.userAgent);
}

interface PwaInstallContextValue {
  /** Normal app routes are accessible. */
  appUnlocked: boolean;
  standalone: boolean;
  installPromptMode: InstallPromptMode;
  canNativeInstall: boolean;
  triggerInstall: () => Promise<"accepted" | "dismissed" | "unavailable">;
  hydrated: boolean;
}

const PwaInstallContext = createContext<PwaInstallContextValue | null>(null);

export function usePwaInstallOptional() {
  return useContext(PwaInstallContext);
}

export function usePwaInstall() {
  const ctx = useContext(PwaInstallContext);
  if (!ctx) throw new Error("usePwaInstall must be used within PwaProvider");
  return ctx;
}

export function PwaProvider({ children }: { children: React.ReactNode }) {
  const [deferredPrompt, setDeferredPrompt] =
    useState<BeforeInstallPromptEvent | null>(null);
  const [standalone, setStandalone] = useState(false);
  const [hydrated, setHydrated] = useState(false);
  const [ios] = useState(() => isIosDevice());
  const [android] = useState(() => isAndroidDevice());
  const bypass = isBrowserAppBypassAllowed();

  const refreshStandalone = useCallback(() => {
    const next = isStandaloneDisplayMode();
    setStandalone(next);
    syncScoringSurfaceCookie(next);
    return next;
  }, []);

  useEffect(() => {
    refreshStandalone();
    setHydrated(true);

    const onBeforeInstall = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };
    const onInstalled = () => {
      setDeferredPrompt(null);
      refreshStandalone();
    };
    const onDisplayMode = () => {
      refreshStandalone();
    };

    window.addEventListener("beforeinstallprompt", onBeforeInstall);
    window.addEventListener("appinstalled", onInstalled);
    const mqs = [
      window.matchMedia("(display-mode: standalone)"),
      window.matchMedia("(display-mode: fullscreen)"),
    ];
    for (const mq of mqs) {
      mq.addEventListener("change", onDisplayMode);
    }

    return () => {
      window.removeEventListener("beforeinstallprompt", onBeforeInstall);
      window.removeEventListener("appinstalled", onInstalled);
      for (const mq of mqs) {
        mq.removeEventListener("change", onDisplayMode);
      }
    };
  }, [refreshStandalone]);

  useEffect(() => {
    if ("serviceWorker" in navigator && process.env.NODE_ENV === "production") {
      void navigator.serviceWorker.register("/sw.js").catch(() => {
        /* optional */
      });
    }
  }, []);

  const appUnlocked = isRedWingsAppUnlocked(
    standalone,
    !isInstallFirstGateEnabled() || bypass,
  );

  const installPromptMode = useMemo(
    () =>
      resolveInstallPromptMode({
        hasDeferredPrompt: Boolean(deferredPrompt),
        isIos: ios,
        isAndroid: android,
      }),
    [deferredPrompt, ios, android],
  );

  const triggerInstall = useCallback(async () => {
    if (!deferredPrompt) return "unavailable";
    await deferredPrompt.prompt();
    const choice = await deferredPrompt.userChoice;
    setDeferredPrompt(null);
    refreshStandalone();
    return choice.outcome;
  }, [deferredPrompt, refreshStandalone]);

  const value = useMemo(
    (): PwaInstallContextValue => ({
      appUnlocked,
      standalone,
      installPromptMode,
      canNativeInstall: Boolean(deferredPrompt),
      triggerInstall,
      hydrated,
    }),
    [
      appUnlocked,
      standalone,
      installPromptMode,
      deferredPrompt,
      triggerInstall,
      hydrated,
    ],
  );

  return (
    <PwaInstallContext.Provider value={value}>
      {children}
    </PwaInstallContext.Provider>
  );
}
