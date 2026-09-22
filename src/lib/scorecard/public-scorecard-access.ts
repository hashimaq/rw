import type { MatchStatus } from "@/lib/database/types";

export interface PublicScorecardGateInput {
  status: MatchStatus;
  is_public_scorecard: boolean;
  is_public_live?: boolean;
}

/**
 * Mirrors anon/public RLS: completed matches with public scorecard flag.
 * Admins bypass via separate caller check (RLS `is_admin()`).
 */
export function isPublicScorecardVisibleToAnon(
  match: PublicScorecardGateInput,
): boolean {
  return match.status === "completed" && match.is_public_scorecard === true;
}

/** Read-only `/match/[slug]` — completed (public scorecard) or live (public live). */
export function canShowFullMatchScorecardPage(
  match: PublicScorecardGateInput,
  options: { isAdmin: boolean },
): boolean {
  if (options.isAdmin) {
    return match.status === "live" || match.status === "completed";
  }
  if (match.status === "completed") {
    return match.is_public_scorecard === true;
  }
  if (match.status === "live") {
    return match.is_public_live === true;
  }
  return false;
}
