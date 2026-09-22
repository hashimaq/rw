/** Pure authorization rules for match deletion (server mirrors this). */

export type MatchDeleteAuthorization =
  | { allowed: true; via: "admin" | "super_admin" | "scorer_controller" }
  | { allowed: false; code: MatchDeleteDenyCode; message: string };

export type MatchDeleteDenyCode =
  | "not_authenticated"
  | "not_authorized"
  | "session_required"
  | "session_invalid"
  | "not_scoring_controller"
  | "match_mismatch";

export interface AdminDeleteContext {
  isAdmin: boolean;
}

export interface ScorerDeleteContext {
  sessionMatchId: string | null;
  requestedMatchId: string;
  sessionActive: boolean;
  isScoringController: boolean;
}

export function authorizeAdminMatchDelete(
  ctx: AdminDeleteContext,
): MatchDeleteAuthorization {
  if (!ctx.isAdmin) {
    return {
      allowed: false,
      code: "not_authorized",
      message: "Admin access required.",
    };
  }
  return { allowed: true, via: "admin" };
}

export function authorizeScorerMatchDelete(
  ctx: ScorerDeleteContext,
): MatchDeleteAuthorization {
  if (!ctx.sessionMatchId || !ctx.sessionActive) {
    return {
      allowed: false,
      code: "session_required",
      message: "Sign in as scorer for this match to delete it.",
    };
  }
  if (!ctx.isScoringController) {
    return {
      allowed: false,
      code: "not_scoring_controller",
      message: "Only the active scoring controller can delete this match.",
    };
  }
  if (ctx.sessionMatchId !== ctx.requestedMatchId) {
    return {
      allowed: false,
      code: "match_mismatch",
      message: "You can only delete the match for your current scorer session.",
    };
  }
  return { allowed: true, via: "scorer_controller" };
}
