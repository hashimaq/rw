/**
 * Whether normal browser tabs must see the full-screen install gate (PWA-only UX).
 * Production defaults to ON unless explicitly opted out.
 */
export function isInstallFirstGateEnabled(): boolean {
  if (process.env.NEXT_PUBLIC_ALLOW_BROWSER_APP === "1") return false;
  if (process.env.NEXT_PUBLIC_PWA_INSTALL_GATE_ENABLED === "0") return false;
  if (process.env.NEXT_PUBLIC_PWA_INSTALL_GATE_ENABLED === "1") return true;
  return process.env.NODE_ENV === "production";
}

/** Optional override for local production-build testing without installing. */
export function isBrowserAppBypassAllowed(): boolean {
  return process.env.NEXT_PUBLIC_ALLOW_BROWSER_APP === "1";
}
