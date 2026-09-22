import { NextResponse } from "next/server";
import { isAuditEnumMissingError } from "@/lib/admin/match-delete";
import { recordAdminAuditEventAsService } from "@/lib/audit/record";
import {
  AuthorizationError,
  getCurrentProfileRole,
  getCurrentUser,
  requireAdmin,
} from "@/lib/auth/admin";
import { revalidateAfterMatchDelete } from "@/lib/match/revalidate-after-match-delete";
import { MatchesRepository } from "@/lib/repositories/matches.repository";
import { createClient } from "@/lib/supabase/server";
import { createServiceRoleClient } from "@/lib/supabase/admin";

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function DELETE(_request: Request, context: RouteContext) {
  try {
    const supabase = await createClient();
    await requireAdmin(supabase);
    const user = await getCurrentUser(supabase);
    if (!user) {
      return NextResponse.json(
        {
          error: "Sign in with your admin account to delete matches.",
          code: "not_authenticated",
        },
        { status: 401 },
      );
    }

    const { id } = await context.params;
    const adminClient = createServiceRoleClient();
    const repo = new MatchesRepository(adminClient);

    const match = await repo.getById(id);
    if (!match) {
      return NextResponse.json(
        { error: "Match not found.", code: "not_found" },
        { status: 404 },
      );
    }

    const actorRole = await getCurrentProfileRole(supabase);

    const auditPayload = {
      action: "MATCH_DELETED" as const,
      entity_type: "match" as const,
      entity_id: match.id,
      previous_data: {
        match_number: match.match_number,
        opponent_name: match.opponent_name,
        status: match.status,
        overs_limit: match.overs_limit,
        share_slug: match.share_slug,
        series_id: match.series_id,
        tournament_id: match.tournament_id,
        match_date: match.match_date,
        venue: match.venue,
      },
      new_data: null,
      metadata: {
        deleted_at: new Date().toISOString(),
        deleted_while_live: match.status === "live",
        deleted_by_user_id: user.id,
      },
    };

    try {
      await recordAdminAuditEventAsService(
        adminClient,
        user.id,
        actorRole,
        auditPayload,
      );
    } catch (auditErr) {
      const auditMessage =
        auditErr instanceof Error ? auditErr.message : String(auditErr);
      if (isAuditEnumMissingError(auditMessage)) {
        return NextResponse.json(
          {
            error:
              "Audit configuration is missing MATCH_DELETED. Apply migration 20250921000012_match_deleted_audit.sql in Supabase, then retry.",
            code: "audit_config_missing",
          },
          { status: 503 },
        );
      }
      throw auditErr;
    }

    const snapshot = await repo.deleteMatchByAdmin(id);

    revalidateAfterMatchDelete(snapshot);

    return NextResponse.json({
      ok: true,
      match_id: snapshot.id,
      deleted_while_live: snapshot.status === "live",
    });
  } catch (err) {
    if (err instanceof AuthorizationError) {
      return NextResponse.json(
        { error: err.message, code: "not_authorized" },
        { status: err.status },
      );
    }
    const message = err instanceof Error ? err.message : "Invalid request";
    if (message.includes("Match not found")) {
      return NextResponse.json(
        { error: message, code: "not_found" },
        { status: 404 },
      );
    }
    if (
      message.includes("Missing NEXT_PUBLIC_SUPABASE_URL") ||
      message.includes("SERVICE_ROLE")
    ) {
      return NextResponse.json(
        {
          error: "Server configuration error. Contact the Super Admin.",
          code: "server_config",
        },
        { status: 500 },
      );
    }
    const safe =
      message.length < 200 && !message.toLowerCase().includes("service_role")
        ? message
        : "Could not delete match. Please try again.";
    return NextResponse.json(
      { error: safe, code: "delete_failed" },
      { status: 500 },
    );
  }
}
