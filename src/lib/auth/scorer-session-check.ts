import "server-only";
import { requireActiveScorerSession } from "@/lib/auth/scoring-session";

/** Returns true when the request has a valid active scorer cookie for the match. */
export async function hasActiveScorerSessionForMatch(
  matchId: string,
): Promise<boolean> {
  try {
    await requireActiveScorerSession(matchId);
    return true;
  } catch {
    return false;
  }
}
