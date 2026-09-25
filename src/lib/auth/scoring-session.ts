import "server-only";
import { cookies } from "next/headers";
import { assertInstalledScoringSurface } from "@/lib/auth/assert-installed-scoring-surface";
import { ScoringAuthorizationError } from "@/lib/auth/scoring-authorization-error";
import { verifySessionToken } from "@/lib/auth/scorer-pin";
import { createServiceRoleClient } from "@/lib/supabase/admin";

export { ScoringAuthorizationError } from "@/lib/auth/scoring-authorization-error";

export const SCORER_SESSION_COOKIE = "rw_scorer_session";

export interface ScorerSessionContext {
  sessionId: string;
  matchId: string;
  token: string;
  isScoringController: boolean;
}

export function parseScorerSessionCookie(
  value: string | undefined,
): ScorerSessionContext | null {
  if (!value) return null;
  const [sessionId, token] = value.split(":");
  if (!sessionId || !token) return null;
  return { sessionId, token, matchId: "", isScoringController: false };
}

export async function requireActiveScorerSession(
  expectedMatchId?: string,
): Promise<ScorerSessionContext & { matchId: string }> {
  await assertInstalledScoringSurface();
  const cookieStore = await cookies();
  const raw = cookieStore.get(SCORER_SESSION_COOKIE)?.value;
  const parsed = parseScorerSessionCookie(raw);
  if (!parsed) {
    throw new Error("Scoring session required");
  }

  const supabase = createServiceRoleClient();
  const { data: session, error } = await supabase
    .from("scoring_sessions")
    .select(
      "id, match_id, session_token_hash, status, ended_at, is_scoring_controller",
    )
    .eq("id", parsed.sessionId)
    .maybeSingle();

  if (error || !session) {
    throw new ScoringAuthorizationError(
      "Invalid scoring session",
      "session_invalid",
    );
  }
  if (session.status !== "active" || session.ended_at) {
    throw new ScoringAuthorizationError(
      "Scoring session is not active",
      "session_invalid",
    );
  }
  if (!verifySessionToken(parsed.token, session.session_token_hash)) {
    throw new ScoringAuthorizationError(
      "Invalid scoring session token",
      "session_invalid",
    );
  }
  if (expectedMatchId && session.match_id !== expectedMatchId) {
    throw new ScoringAuthorizationError(
      "Scoring session match mismatch",
      "session_invalid",
    );
  }

  await supabase
    .from("scoring_sessions")
    .update({ last_seen_at: new Date().toISOString() })
    .eq("id", session.id);

  return {
    sessionId: session.id,
    matchId: session.match_id,
    token: parsed.token,
    isScoringController: session.is_scoring_controller,
  };
}

export async function requireScoringControllerSession(
  expectedMatchId?: string,
): Promise<ScorerSessionContext & { matchId: string }> {
  try {
    const session = await requireActiveScorerSession(expectedMatchId);
    if (!session.isScoringController) {
      throw new ScoringAuthorizationError(
        "This device is not the active scoring controller",
        "not_scoring_controller",
      );
    }
    return session;
  } catch (err) {
    if (err instanceof ScoringAuthorizationError) throw err;
    throw new ScoringAuthorizationError(
      err instanceof Error ? err.message : "Scoring session required",
      "session_required",
    );
  }
}
