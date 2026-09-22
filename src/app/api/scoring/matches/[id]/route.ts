import { NextResponse } from "next/server";
import { isAuditEnumMissingError } from "@/lib/admin/match-delete";
import {
  recordScoringControlAudit,
  resolveMatchAuditActorUserId,
} from "@/lib/audit/record-scoring-control";
import {
  requireScoringControllerSession,
  ScoringAuthorizationError,
} from "@/lib/auth/scoring-session";
import { authorizeScorerMatchDelete } from "@/lib/match/match-delete-policy";
import { revalidateAfterMatchDelete } from "@/lib/match/revalidate-after-match-delete";
import { MatchesRepository } from "@/lib/repositories/matches.repository";
import { clearScorerSessionCookie } from "@/lib/scoring/session-cookie";
import { createServiceRoleClient } from "@/lib/supabase/admin";

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function DELETE(_request: Request, context: RouteContext) {
  try {
    const { id: matchId } = await context.params;
    const adminClient = createServiceRoleClient();
    const repo = new MatchesRepository(adminClient);

    const match = await repo.getById(matchId);
    if (!match) {
      return NextResponse.json(
        { error: "Match not found.", code: "not_found" },
        { status: 404 },
      );
    }

    let session: Awaited<ReturnType<typeof requireScoringControllerSession>>;
    try {
      session = await requireScoringControllerSession(matchId);
    } catch (err) {
      if (err instanceof ScoringAuthorizationError) {
        const policy = authorizeScorerMatchDelete({
          sessionMatchId: null,
          requestedMatchId: matchId,
          sessionActive: false,
          isScoringController: false,
        });
        if (err.code === "not_scoring_controller") {
          return NextResponse.json(
            {
              error:
                "Only the active scoring controller can delete this match.",
              code: "not_scoring_controller",
            },
            { status: 403 },
          );
        }
        const msg =
          !policy.allowed && "message" in policy
            ? policy.message
            : err.message;
        return NextResponse.json(
          { error: msg, code: err.code },
          { status: err.code === "session_invalid" ? 401 : 403 },
        );
      }
      throw err;
    }

    const policy = authorizeScorerMatchDelete({
      sessionMatchId: session.matchId,
      requestedMatchId: matchId,
      sessionActive: true,
      isScoringController: session.isScoringController,
    });
    if (!policy.allowed) {
      return NextResponse.json(
        { error: policy.message, code: policy.code },
        { status: policy.code === "match_mismatch" ? 403 : 401 },
      );
    }

    const actorUserId = await resolveMatchAuditActorUserId(adminClient, matchId);

    const auditPayload = {
      action: "MATCH_DELETED_BY_SCORER" as const,
      matchId: match.id,
      actorUserId,
      previous_data: {
        match_number: match.match_number,
        opponent_name: match.opponent_name,
        status: match.status,
        overs_limit: match.overs_limit,
        share_slug: match.share_slug,
      },
      metadata: {
        deleted_at: new Date().toISOString(),
        deleted_while_live: match.status === "live",
        deletion_source: "scorer_session",
        scoring_session_id: session.sessionId,
        match_status: match.status,
      },
    };

    try {
      await recordScoringControlAudit(adminClient, auditPayload);
    } catch (auditErr) {
      const auditMessage =
        auditErr instanceof Error ? auditErr.message : String(auditErr);
      if (isAuditEnumMissingError(auditMessage)) {
        return NextResponse.json(
          {
            error:
              "Audit configuration is missing MATCH_DELETED_BY_SCORER. Apply migration 20250921000018_scorer_match_deleted_audit.sql in Supabase, then retry.",
            code: "audit_config_missing",
          },
          { status: 503 },
        );
      }
      throw auditErr;
    }

    const snapshot = await repo.deleteMatchByAdmin(matchId);
    revalidateAfterMatchDelete(snapshot);

    const response = NextResponse.json({
      ok: true,
      match_id: snapshot.id,
      deleted_while_live: snapshot.status === "live",
      via: "scorer",
    });
    return clearScorerSessionCookie(response);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Invalid request";
    if (message.includes("Match not found")) {
      return NextResponse.json(
        { error: message, code: "not_found" },
        { status: 404 },
      );
    }
    return NextResponse.json(
      { error: "Could not delete match. Please try again.", code: "delete_failed" },
      { status: 500 },
    );
  }
}
