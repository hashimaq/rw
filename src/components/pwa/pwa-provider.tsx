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
import { isRedWingsAlreadyInstalledOnDevice } from "@/lib/pwa/detect-installed-pwa";
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
  appUnlocked: boolean;
  standalone: boolean;
  /** PWA on device but user is in a normal browser tab — no install CTA. */
  alreadyInstalledOnDevice: boolean;
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
  const [standalone, setStandalone] = useState(() => {
    const mode = isStandaloneDisplayMode();
    if (mode) {
      syncScoringSurfaceCookie(true);
    }
    return mode;
  });
  const [alreadyInstalledOnDevice, setAlreadyInstalledOnDevice] =
    useState(false);
  const [hydrated, setHydrated] = useState(false);
  const [ios] = useState(() => isIosDevice());
  const [android] = useState(() => isAndroidDevice());
  const bypass = isBrowserAppBypassAllowed();

  const refreshStandalone = useCallback(() => {
    const next = isStandaloneDisplayMode();
    setStandalone(next);
    syncScoringSurfaceCookie(next);
    if (next) {
      document.documentElement.removeAttribute("data-rw-install-gate");
    }
    return next;
  }, []);

  useEffect(() => {
    if (refreshStandalone()) {
      setHydrated(true);
      return;
    }

    setHydrated(true);

    void isRedWingsAlreadyInstalledOnDevice().then(setAlreadyInstalledOnDevice);

    const onBeforeInstall = (e: Event) => {
      if (isStandaloneDisplayMode()) return;
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };
    const onInstalled = () => {
      setDeferredPrompt(null);
      setAlreadyInstalledOnDevice(true);
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
    if (!("serviceWorker" in navigator) || process.env.NODE_ENV !== "production") {
      return;
    }
    void navigator.serviceWorker
      .register("/sw.js")
      .then((registration) => {
        void registration.update();
        registration.addEventListener("updatefound", () => {
          const worker = registration.installing;
          if (!worker) return;
          worker.addEventListener("statechange", () => {
            if (
              worker.state === "activated" &&
              isStandaloneDisplayMode()
            ) {
              /* New SW active — next navigation uses fresh assets (network-first HTML). */
            }
          });
        });
      })
      .catch(() => {
        /* optional */
      });
  }, []);

  const appUnlocked = isRedWingsAppUnlocked(standalone, bypass);

  const installPromptMode = useMemo((): InstallPromptMode => {
    if (alreadyInstalledOnDevice && !standalone) return "already_installed";
    if (standalone) return "manual_unsupported";
    return resolveInstallPromptMode({
      hasDeferredPrompt: Boolean(deferredPrompt),
      isIos: ios,
      isAndroid: android,
    });
  }, [deferredPrompt, ios, android, standalone, alreadyInstalledOnDevice]);

  useEffect(() => {
    if (alreadyInstalledOnDevice) setDeferredPrompt(null);
  }, [alreadyInstalledOnDevice]);

  const canNativeInstall =
    Boolean(deferredPrompt) && !standalone && !alreadyInstalledOnDevice;

  const triggerInstall = useCallback(async () => {
    if (!deferredPrompt || standalone || alreadyInstalledOnDevice) {
      return "unavailable";
    }
    const promptEvent = deferredPrompt;
    try {
      await promptEvent.prompt();
      const choice = await promptEvent.userChoice;
      refreshStandalone();
      return choice.outcome;
    } finally {
      setDeferredPrompt(null);
      refreshStandalone();
    }
  }, [deferredPrompt, standalone, alreadyInstalledOnDevice, refreshStandalone]);

  const value = useMemo(
    (): PwaInstallContextValue => ({
      appUnlocked,
      standalone,
      alreadyInstalledOnDevice,
      installPromptMode,
      canNativeInstall,
      triggerInstall,
      hydrated,
    }),
    [
      appUnlocked,
      standalone,
      alreadyInstalledOnDevice,
      installPromptMode,
      canNativeInstall,
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
