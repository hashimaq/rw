/**
 * Shared client/server policy for installed-app scoring (not a security proof).
 * Production defaults to requiring installed surface unless opted out.
 */
export function isScoringRequiresInstalledClient(): boolean {
  if (process.env.NEXT_PUBLIC_ALLOW_BROWSER_APP === "1") return false;
  if (process.env.NEXT_PUBLIC_SCORING_REQUIRES_PWA === "0") return false;
  if (process.env.NEXT_PUBLIC_SCORING_REQUIRES_PWA === "1") return true;
  return process.env.NODE_ENV === "production";
}
