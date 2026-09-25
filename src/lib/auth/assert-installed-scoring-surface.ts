import "server-only";

import {
  isScoringRequiresInstalledClient,
  isScoringSurfaceAllowedOnServer,
} from "@/lib/auth/scoring-installed-surface";
import { ScoringAuthorizationError } from "@/lib/auth/scoring-authorization-error";

/** Defense-in-depth gate — bypassable by setting a cookie; PIN/session remain authoritative. */
export async function assertInstalledScoringSurface(): Promise<void> {
  if (!isScoringRequiresInstalledClient()) return;
  const allowed = await isScoringSurfaceAllowedOnServer();
  if (!allowed) {
    throw new ScoringAuthorizationError(
      "Scoring is available only in the installed Red Wings Cricket app",
      "installed_app_required",
    );
  }
}
