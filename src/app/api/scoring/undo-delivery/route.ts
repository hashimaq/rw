import { NextResponse } from "next/server";
import { z } from "zod";
import {
  requireScoringControllerSession,
  ScoringAuthorizationError,
} from "@/lib/auth/scoring-session";
import { createServiceRoleClient } from "@/lib/supabase/admin";

const bodySchema = z.object({
  client_event_id: z.string().uuid(),
});

export async function POST(request: Request) {
  try {
    const json = await request.json();
    const { client_event_id: clientEventId } = bodySchema.parse(json);
    const session = await requireScoringControllerSession();
    const supabase = createServiceRoleClient();

    const { data: delivery, error: findError } = await supabase
      .from("deliveries")
      .select("id, innings_id")
      .eq("client_event_id", clientEventId)
      .maybeSingle();

    if (findError) {
      return NextResponse.json({ error: findError.message }, { status: 500 });
    }
    if (!delivery) {
      return NextResponse.json({ ok: true, removed: false });
    }

    const { data: innings, error: inningsError } = await supabase
      .from("innings")
      .select("match_id")
      .eq("id", delivery.innings_id)
      .maybeSingle();

    if (inningsError || !innings) {
      return NextResponse.json({ error: "Innings not found" }, { status: 404 });
    }
    if (innings.match_id !== session.matchId) {
      return NextResponse.json({ error: "Match mismatch" }, { status: 403 });
    }

    const { data: lastDelivery } = await supabase
      .from("deliveries")
      .select("client_event_id, sequence_in_innings")
      .eq("innings_id", delivery.innings_id)
      .order("sequence_in_innings", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (
      !lastDelivery ||
      lastDelivery.client_event_id !== clientEventId
    ) {
      return NextResponse.json(
        { error: "Only the last delivery in this innings can be undone" },
        { status: 409 },
      );
    }

    const { error: deleteError } = await supabase
      .from("deliveries")
      .delete()
      .eq("client_event_id", clientEventId);

    if (deleteError) {
      return NextResponse.json({ error: deleteError.message }, { status: 500 });
    }

    return NextResponse.json({ ok: true, removed: true });
  } catch (err) {
    if (err instanceof ScoringAuthorizationError) {
      const status =
        err.code === "not_scoring_controller"
          ? 403
          : err.code === "session_required" || err.code === "session_invalid"
            ? 401
            : 403;
      return NextResponse.json(
        { error: err.message, code: err.code },
        { status },
      );
    }
    const message = err instanceof Error ? err.message : "Invalid request";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
