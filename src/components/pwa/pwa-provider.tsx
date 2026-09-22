"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  isIosDevice,
  isInstallSkippedThisSession,
  isStandaloneDisplayMode,
  markInstallSkippedThisSession,
  PWA_INSTALL_DISMISSED_KEY,
  resolveInstallUiMode,
  shouldAutoPresentFullScreenInstall,
  shouldShowInstallAfterDismiss,
  type InstallUiMode,
} from "@/lib/pwa/install-state";

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

interface PwaInstallContextValue {
  uiMode: InstallUiMode;
  canNativeInstall: boolean;
  fullScreenVisible: boolean;
  forceShow: boolean;
  dismissInstall: () => void;
  skipForSession: () => void;
  continueInBrowser: () => void;
  triggerInstall: () => Promise<"accepted" | "dismissed" | "unavailable">;
  openInstallExperience: () => void;
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
  const [forceShow, setForceShow] = useState(false);
  const [fullScreenVisible, setFullScreenVisible] = useState(false);
  const [sessionSkipped, setSessionSkipped] = useState(false);
  const [ios] = useState(() => isIosDevice());
  const autoPresentedRef = useRef(false);

  useEffect(() => {
    setStandalone(isStandaloneDisplayMode());
    setSessionSkipped(isInstallSkippedThisSession());
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
      setFullScreenVisible(false);
      setForceShow(false);
      markInstallSkippedThisSession();
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
    return !shouldShowInstallAfterDismiss(dismissedAt, Date.now());
  }, [dismissedAt]);

  const uiMode = useMemo(
    () =>
      resolveInstallUiMode({
        standalone,
        dismissedRecently,
        hasDeferredPrompt: Boolean(deferredPrompt),
        isIos: ios,
        forceShow,
      }),
    [standalone, dismissedRecently, forceShow, deferredPrompt, ios],
  );

  useEffect(() => {
    if (standalone) {
      setFullScreenVisible(false);
      return;
    }
    const shouldShow = shouldAutoPresentFullScreenInstall({
      uiMode,
      sessionSkipped,
      forceShow,
    });
    if (!shouldShow) {
      if (!forceShow) setFullScreenVisible(false);
      return;
    }
    if (forceShow) {
      setFullScreenVisible(true);
      return;
    }
    if (autoPresentedRef.current) return;
    autoPresentedRef.current = true;
    setFullScreenVisible(true);
  }, [uiMode, sessionSkipped, forceShow, standalone, deferredPrompt]);

  const dismissInstall = useCallback(() => {
    const at = Date.now();
    setDismissedAt(at);
    try {
      localStorage.setItem(PWA_INSTALL_DISMISSED_KEY, String(at));
    } catch {
      /* ignore */
    }
    setForceShow(false);
    setFullScreenVisible(false);
  }, []);

  const skipForSession = useCallback(() => {
    markInstallSkippedThisSession();
    setSessionSkipped(true);
    setFullScreenVisible(false);
    setForceShow(false);
  }, []);

  const continueInBrowser = useCallback(() => {
    skipForSession();
    dismissInstall();
  }, [dismissInstall, skipForSession]);

  const triggerInstall = useCallback(async () => {
    if (!deferredPrompt) return "unavailable";
    await deferredPrompt.prompt();
    const choice = await deferredPrompt.userChoice;
    setDeferredPrompt(null);
    if (choice.outcome === "accepted") {
      setStandalone(true);
      setFullScreenVisible(false);
      setForceShow(false);
      markInstallSkippedThisSession();
    }
    return choice.outcome;
  }, [deferredPrompt]);

  const openInstallExperience = useCallback(() => {
    setForceShow(true);
    setFullScreenVisible(true);
  }, []);

  const value = useMemo(
    (): PwaInstallContextValue => ({
      uiMode,
      canNativeInstall: Boolean(deferredPrompt),
      fullScreenVisible,
      forceShow,
      dismissInstall,
      skipForSession,
      continueInBrowser,
      triggerInstall,
      openInstallExperience,
    }),
    [
      uiMode,
      deferredPrompt,
      fullScreenVisible,
      forceShow,
      dismissInstall,
      skipForSession,
      continueInBrowser,
      triggerInstall,
      openInstallExperience,
    ],
  );

  return (
    <PwaInstallContext.Provider value={value}>
      {children}
    </PwaInstallContext.Provider>
  );
}
