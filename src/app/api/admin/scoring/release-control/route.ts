import { NextResponse } from "next/server";
import { z } from "zod";
import { recordAdminAuditEvent } from "@/lib/audit/record";
import { getCurrentUser, requireAdmin } from "@/lib/auth/admin";
import { findActiveControllerSession } from "@/lib/scoring/control";
import { createClient } from "@/lib/supabase/server";
import { createServiceRoleClient } from "@/lib/supabase/admin";

const bodySchema = z.object({
  match_id: z.string().uuid(),
});

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    await requireAdmin(supabase);
    const adminUser = await getCurrentUser(supabase);
    const json = await request.json();
    const body = bodySchema.parse(json);
    const service = createServiceRoleClient();

    const { data: match, error: matchError } = await service
      .from("matches")
      .select("id, status, match_number, opponent_name")
      .eq("id", body.match_id)
      .maybeSingle();

    if (matchError || !match) {
      return NextResponse.json({ error: "Match not found" }, { status: 404 });
    }

    if (match.status !== "live" && match.status !== "setup") {
      return NextResponse.json(
        { error: "Match is not in a scorable state" },
        { status: 409 },
      );
    }

    const controller = await findActiveControllerSession(service, body.match_id);

    const { error: rpcError } = await service.rpc("release_scoring_controller", {
      p_match_id: body.match_id,
    });

    if (rpcError) {
      return NextResponse.json({ error: rpcError.message }, { status: 500 });
    }

    await recordAdminAuditEvent(supabase, {
      action: "ADMIN_SCORING_TAKEOVER",
      entity_type: "match",
      entity_id: match.id,
      previous_data: controller
        ? { controller_session_id: controller.id }
        : null,
      new_data: { controller_session_id: null },
      metadata: {
        match_number: match.match_number,
        opponent_name: match.opponent_name,
        admin_user_id: adminUser?.id ?? null,
      },
    });

    return NextResponse.json({ status: "released" });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Invalid request";
    const status = message.includes("Admin") ? 403 : 400;
    return NextResponse.json({ error: message }, { status });
  }
}
