/** True when Red Wings is running as an installed PWA (not a normal browser tab). */
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

/**
 * Local development only — production must remain install-first.
 * Set NEXT_PUBLIC_ALLOW_BROWSER_APP=1 to test in browser during development.
 */
export function isBrowserAppBypassAllowed(): boolean {
  if (process.env.NODE_ENV === "development") return true;
  return process.env.NEXT_PUBLIC_ALLOW_BROWSER_APP === "1";
}

/** Normal Red Wings app UI is allowed only when installed or explicitly bypassed (dev). */
export function isRedWingsAppUnlocked(
  standalone: boolean,
  bypassAllowed: boolean = isBrowserAppBypassAllowed(),
): boolean {
  return standalone || bypassAllowed;
}

export type InstallPromptMode =
  | "native_prompt"
  | "ios_manual"
  | "manual_unsupported";

export function resolveInstallPromptMode(input: {
  hasDeferredPrompt: boolean;
  isIos: boolean;
}): InstallPromptMode {
  if (input.hasDeferredPrompt) return "native_prompt";
  if (input.isIos) return "ios_manual";
  return "manual_unsupported";
}
