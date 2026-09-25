import {
  isBrowserAppBypassAllowed,
  isInstallFirstGateEnabled,
} from "@/lib/pwa/install-gate-enabled";

export {
  isBrowserAppBypassAllowed,
  isInstallFirstGateEnabled,
} from "@/lib/pwa/install-gate-enabled";

/** True when Red Wings is running as an installed PWA (not a normal browser tab). */
export function isStandaloneDisplayMode(): boolean {
  if (typeof window === "undefined") return false;
  if (window.matchMedia("(display-mode: standalone)").matches) return true;
  if (window.matchMedia("(display-mode: fullscreen)").matches) return true;
  const nav = window.navigator as Navigator & { standalone?: boolean };
  return nav.standalone === true;
}

export function isIosDevice(): boolean {
  if (typeof navigator === "undefined") return false;
  return /iphone|ipad|ipod/i.test(navigator.userAgent);
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
  | "manual_unsupported"
  | "android_manual"
  | "already_installed";

export function resolveInstallPromptMode(input: {
  hasDeferredPrompt: boolean;
  isIos: boolean;
  isAndroid: boolean;
}): InstallPromptMode {
  if (input.hasDeferredPrompt) return "native_prompt";
  if (input.isIos) return "ios_manual";
  if (input.isAndroid) return "android_manual";
  return "manual_unsupported";
}

export const PWA_INTENDED_PATH_KEY = "rw-pwa-intended-path-v1";
