import {
  SCORING_SURFACE_COOKIE,
  SCORING_SURFACE_STANDALONE,
} from "@/lib/auth/scoring-installed-surface.constants";

const MAX_AGE_SEC = 60 * 60 * 24 * 400;

/** Client-only: mark this browser profile as the installed PWA surface. */
export function syncScoringSurfaceCookie(standalone: boolean): void {
  if (typeof document === "undefined") return;
  if (standalone) {
    document.cookie = `${SCORING_SURFACE_COOKIE}=${SCORING_SURFACE_STANDALONE}; path=/; max-age=${MAX_AGE_SEC}; SameSite=Lax`;
  } else {
    document.cookie = `${SCORING_SURFACE_COOKIE}=; path=/; max-age=0; SameSite=Lax`;
  }
}
