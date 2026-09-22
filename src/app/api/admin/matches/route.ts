import { revalidateTag } from "next/cache";
import { NextResponse } from "next/server";
import { recordAdminAuditEvent } from "@/lib/audit/record";
import { requireAdmin } from "@/lib/auth/admin";
import { CACHE_TAGS } from "@/lib/cache/tags";
import { createMatchFromSetupPayload } from "@/lib/matches/create-from-setup";
import { matchMetadataFromSetup } from "@/lib/match/match-setup-plan";
import { matchSetupCreateSchema } from "@/lib/validation/match-setup";
import { ZodError } from "zod";
import { createClient } from "@/lib/supabase/server";

/** Admin alias for match creation (same validation as public setup API). */
export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    await requireAdmin(supabase);

    const json = (await request.json()) as Record<string, unknown>;
    const { scorer_pin_confirm: _confirm, ...body } = json;
    const input = matchSetupCreateSchema.parse(body);

    const {
      data: { user },
    } = await supabase.auth.getUser();

    const match = await createMatchFromSetupPayload(json, user?.id ?? null);

    const xiCount = input.lineup.filter((e) => e.squad_status === "playing_xi").length;
    const guestCount = input.lineup.filter((e) => e.kind === "guest").length;
    const meta = matchMetadataFromSetup(
      input.red_wings_role,
      input.red_wings_innings,
    );

    await recordAdminAuditEvent(supabase, {
      action: "MATCH_CREATED",
      entity_type: "match",
      entity_id: match.id,
      new_data: {
        match_number: match.match_number,
        opponent_name: match.opponent_name,
        status: match.status,
        overs_limit: match.overs_limit,
        red_wings_role: input.red_wings_role,
        red_wings_innings: input.red_wings_innings,
        toss_winner: meta.toss_winner,
        toss_decision: meta.toss_decision,
        red_wings_batting_first: meta.red_wings_batting_first,
        series_id: match.series_id,
        tournament_id: match.tournament_id,
        playing_xi_count: xiCount,
        guest_player_count: guestCount,
        bench_count: input.lineup.filter((e) => e.squad_status === "bench").length,
      },
    });

    revalidateTag(CACHE_TAGS.matches, "max");
    revalidateTag(CACHE_TAGS.adminAudit, "max");

    const { scorer_pin_hash: _hash, ...publicMatch } = match;
    return NextResponse.json({ match: publicMatch }, { status: 201 });
  } catch (err) {
    if (err instanceof ZodError) {
      const first = err.issues[0]?.message ?? "Invalid match setup data";
      return NextResponse.json({ error: first }, { status: 400 });
    }
    const message = err instanceof Error ? err.message : "Invalid request";
    const status = message.includes("Admin authorization") ? 403 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
