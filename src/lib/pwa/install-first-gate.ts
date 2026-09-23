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
 * Re-enable install-first gate at project end by setting
 * NEXT_PUBLIC_PWA_INSTALL_GATE_ENABLED=1 in production env.
 */
export function isInstallFirstGateEnabled(): boolean {
  return process.env.NEXT_PUBLIC_PWA_INSTALL_GATE_ENABLED === "1";
}

/** Optional override for local production-build testing without installing. */
export function isBrowserAppBypassAllowed(): boolean {
  return process.env.NEXT_PUBLIC_ALLOW_BROWSER_APP === "1";
}

/** Normal Red Wings app UI when gate is off, installed, or explicit bypass. */
export function isRedWingsAppUnlocked(
  standalone: boolean,
  bypassAllowed: boolean = isBrowserAppBypassAllowed(),
): boolean {
  if (!isInstallFirstGateEnabled()) return true;
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
