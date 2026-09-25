import "server-only";

import { cookies } from "next/headers";
import {
  SCORING_SURFACE_COOKIE,
  SCORING_SURFACE_STANDALONE,
} from "@/lib/auth/scoring-installed-surface.constants";

export { SCORING_SURFACE_COOKIE, SCORING_SURFACE_STANDALONE };

import { isScoringRequiresInstalledClient } from "@/lib/pwa/scoring-surface-policy";

export { isScoringRequiresInstalledClient };

export async function isScoringSurfaceAllowedOnServer(): Promise<boolean> {
  if (!isScoringRequiresInstalledClient()) return true;
  const store = await cookies();
  return store.get(SCORING_SURFACE_COOKIE)?.value === SCORING_SURFACE_STANDALONE;
}
