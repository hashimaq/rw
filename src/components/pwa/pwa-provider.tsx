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
  isIosDevice,
  isStandaloneDisplayMode,
  PWA_INSTALL_DISMISSED_KEY,
  resolveInstallUiMode,
  shouldShowInstallBannerAfterDismiss,
  type InstallUiMode,
} from "@/lib/pwa/install-state";

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

interface PwaInstallContextValue {
  uiMode: InstallUiMode;
  canNativeInstall: boolean;
  dismissBanner: () => void;
  triggerInstall: () => Promise<"accepted" | "dismissed" | "unavailable">;
  openInstallSheet: () => void;
  closeInstallSheet: () => void;
  sheetOpen: boolean;
}

const PwaInstallContext = createContext<PwaInstallContextValue | null>(null);

export function usePwaInstall() {
  const ctx = useContext(PwaInstallContext);
  if (!ctx) {
    throw new Error("usePwaInstall must be used within PwaProvider");
  }
  return ctx;
}

export function usePwaInstallOptional() {
  return useContext(PwaInstallContext);
}

export function PwaProvider({ children }: { children: React.ReactNode }) {
  const [deferredPrompt, setDeferredPrompt] =
    useState<BeforeInstallPromptEvent | null>(null);
  const [standalone, setStandalone] = useState(false);
  const [dismissedAt, setDismissedAt] = useState<number | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [ios] = useState(() => isIosDevice());

  useEffect(() => {
    setStandalone(isStandaloneDisplayMode());
    try {
      const raw = localStorage.getItem(PWA_INSTALL_DISMISSED_KEY);
      if (raw) setDismissedAt(Number.parseInt(raw, 10));
    } catch {
      /* ignore */
    }

    const onBeforeInstall = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };
    const onInstalled = () => {
      setDeferredPrompt(null);
      setStandalone(true);
      setSheetOpen(false);
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
        /* registration optional */
      });
    }
  }, []);

  const dismissedRecently = useMemo(() => {
    if (dismissedAt == null) return false;
    return !shouldShowInstallBannerAfterDismiss(dismissedAt, Date.now());
  }, [dismissedAt]);

  const uiMode = useMemo(
    () =>
      resolveInstallUiMode({
        standalone,
        dismissedRecently: dismissedRecently && !sheetOpen,
        hasDeferredPrompt: Boolean(deferredPrompt),
        isIos: ios,
      }),
    [standalone, dismissedRecently, sheetOpen, deferredPrompt, ios],
  );

  const dismissBanner = useCallback(() => {
    const at = Date.now();
    setDismissedAt(at);
    try {
      localStorage.setItem(PWA_INSTALL_DISMISSED_KEY, String(at));
    } catch {
      /* ignore */
    }
    setSheetOpen(false);
  }, []);

  const triggerInstall = useCallback(async () => {
    if (!deferredPrompt) return "unavailable";
    await deferredPrompt.prompt();
    const choice = await deferredPrompt.userChoice;
    setDeferredPrompt(null);
    if (choice.outcome === "accepted") {
      setStandalone(true);
      setSheetOpen(false);
    }
    return choice.outcome;
  }, [deferredPrompt]);

  const value = useMemo(
    (): PwaInstallContextValue => ({
      uiMode,
      canNativeInstall: Boolean(deferredPrompt),
      dismissBanner,
      triggerInstall,
      openInstallSheet: () => setSheetOpen(true),
      closeInstallSheet: () => setSheetOpen(false),
      sheetOpen,
    }),
    [uiMode, deferredPrompt, dismissBanner, triggerInstall, sheetOpen],
  );

  return (
    <PwaInstallContext.Provider value={value}>
      {children}
    </PwaInstallContext.Provider>
  );
}
