/**
 * Ephemeral sessionStorage recall for Show/Hide on the scoring screen only.
 * Not used for authentication — authorization is the httpOnly scorer session cookie.
 */

const prefix = "rw_scorer_pin:";

export function rememberScorerPinForSlug(slug: string, pin: string): void {
  if (typeof sessionStorage === "undefined") return;
  if (!/^\d{4}$/.test(pin)) return;
  sessionStorage.setItem(`${prefix}${slug}`, pin);
}

export function readRememberedScorerPin(slug: string): string | null {
  if (typeof sessionStorage === "undefined") return null;
  const pin = sessionStorage.getItem(`${prefix}${slug}`);
  return pin && /^\d{4}$/.test(pin) ? pin : null;
}

export function forgetRememberedScorerPin(slug: string): void {
  if (typeof sessionStorage === "undefined") return;
  sessionStorage.removeItem(`${prefix}${slug}`);
}
