export const PWA_INSTALL_DISMISSED_KEY = "rw_pwa_install_dismissed_at";
export const PWA_INSTALL_DISMISS_COOLDOWN_MS = 7 * 24 * 60 * 60 * 1000;

export function isStandaloneDisplayMode(): boolean {
  if (typeof window === "undefined") return false;
  const mq = window.matchMedia("(display-mode: standalone)");
  if (mq.matches) return true;
  const nav = window.navigator as Navigator & { standalone?: boolean };
  return nav.standalone === true;
}

export function isIosDevice(): boolean {
  if (typeof navigator === "undefined") return false;
  return /iphone|ipad|ipod/i.test(navigator.userAgent);
}

export function shouldShowInstallBannerAfterDismiss(
  dismissedAtMs: number | null,
  nowMs: number,
): boolean {
  if (dismissedAtMs == null) return true;
  return nowMs - dismissedAtMs >= PWA_INSTALL_DISMISS_COOLDOWN_MS;
}

export type InstallUiMode =
  | "hidden_installed"
  | "hidden_dismissed"
  | "native_prompt"
  | "ios_manual"
  | "manual_unsupported";

export function resolveInstallUiMode(input: {
  standalone: boolean;
  dismissedRecently: boolean;
  hasDeferredPrompt: boolean;
  isIos: boolean;
}): InstallUiMode {
  if (input.standalone) return "hidden_installed";
  if (input.dismissedRecently) return "hidden_dismissed";
  if (input.hasDeferredPrompt) return "native_prompt";
  if (input.isIos) return "ios_manual";
  return "manual_unsupported";
}
