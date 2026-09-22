import "server-only";
import { cookies } from "next/headers";
import {
  parseScorerSessionCookie,
  SCORER_SESSION_COOKIE,
} from "@/lib/auth/scoring-session";
import { verifySessionToken } from "@/lib/auth/scorer-pin";
import type { ScoringControlRole } from "@/lib/scoring/control";
import {
  findActiveControllerSession,
  findPendingTransferForSession,
} from "@/lib/scoring/control";
import { createServiceRoleClient } from "@/lib/supabase/admin";

export interface MatchSessionStatusPayload {
  authorized: boolean;
  scoring_role: ScoringControlRole;
  has_active_controller: boolean;
  pending_transfer: {
    id: string;
    direction: "incoming" | "outgoing";
  } | null;
  match_status: string;
  match: {
    id: string;
    match_number: string;
    opponent_name: string;
    overs_limit: number;
    status: string;
  };
}

export async function buildMatchSessionStatus(
  match: {
    id: string;
    match_number: string;
    opponent_name: string;
    overs_limit: number;
    status: string;
  },
): Promise<MatchSessionStatusPayload> {
  const supabase = createServiceRoleClient();
  const controller = await findActiveControllerSession(supabase, match.id);

  const cookieStore = await cookies();
  const raw = cookieStore.get(SCORER_SESSION_COOKIE)?.value;
  const parsed = parseScorerSessionCookie(raw);

  let scoring_role: ScoringControlRole = "none";
  let pending_transfer: MatchSessionStatusPayload["pending_transfer"] = null;

  if (parsed) {
    const { data: session } = await supabase
      .from("scoring_sessions")
      .select("id, match_id, session_token_hash, status, ended_at, is_scoring_controller")
      .eq("id", parsed.sessionId)
      .maybeSingle();

    if (
      session &&
      session.status === "active" &&
      !session.ended_at &&
      session.match_id === match.id &&
      verifySessionToken(parsed.token, session.session_token_hash)
    ) {
      if (session.is_scoring_controller) {
        scoring_role = "controller";
      } else {
        scoring_role = "viewer";
      }
      pending_transfer = await findPendingTransferForSession(
        supabase,
        match.id,
        session.id,
        session.is_scoring_controller,
      );
    }
  }

  return {
    authorized: scoring_role !== "none",
    scoring_role,
    has_active_controller: Boolean(controller),
    pending_transfer,
    match_status: match.status,
    match: {
      id: match.id,
      match_number: match.match_number,
      opponent_name: match.opponent_name,
      overs_limit: match.overs_limit,
      status: match.status,
    },
  };
}
