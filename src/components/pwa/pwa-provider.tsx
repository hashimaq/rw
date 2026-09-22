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
  isIosDevice,
  isRedWingsAppUnlocked,
  isStandaloneDisplayMode,
  resolveInstallPromptMode,
  type InstallPromptMode,
} from "@/lib/pwa/install-first-gate";

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

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
  const bypass = isBrowserAppBypassAllowed();

  useEffect(() => {
    setStandalone(isStandaloneDisplayMode());
    setHydrated(true);

    const onBeforeInstall = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };
    const onInstalled = () => {
      setDeferredPrompt(null);
      setStandalone(true);
    };
    const onDisplayMode = () => setStandalone(isStandaloneDisplayMode());

    window.addEventListener("beforeinstallprompt", onBeforeInstall);
    window.addEventListener("appinstalled", onInstalled);
    window
      .matchMedia("(display-mode: standalone)")
      .addEventListener("change", onDisplayMode);

    return () => {
      window.removeEventListener("beforeinstallprompt", onBeforeInstall);
      window.removeEventListener("appinstalled", onInstalled);
      window
        .matchMedia("(display-mode: standalone)")
        .removeEventListener("change", onDisplayMode);
    };
  }, []);

  useEffect(() => {
    if ("serviceWorker" in navigator && process.env.NODE_ENV === "production") {
      void navigator.serviceWorker.register("/sw.js").catch(() => {
        /* optional */
      });
    }
  }, []);

  const appUnlocked = isRedWingsAppUnlocked(standalone, bypass);

  const installPromptMode = useMemo(
    () =>
      resolveInstallPromptMode({
        hasDeferredPrompt: Boolean(deferredPrompt),
        isIos: ios,
      }),
    [deferredPrompt, ios],
  );

  const triggerInstall = useCallback(async () => {
    if (!deferredPrompt) return "unavailable";
    await deferredPrompt.prompt();
    const choice = await deferredPrompt.userChoice;
    setDeferredPrompt(null);
    if (choice.outcome === "accepted") {
      setStandalone(isStandaloneDisplayMode());
    }
    return choice.outcome;
  }, [deferredPrompt]);

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
