import { revalidateTag } from "next/cache";
import { NextResponse } from "next/server";
import { isAdmin } from "@/lib/auth/admin";
import { recordAdminAuditEvent } from "@/lib/audit/record";
import { CACHE_TAGS } from "@/lib/cache/tags";
import { createMatchFromSetupPayload } from "@/lib/matches/create-from-setup";
import { matchMetadataFromSetup } from "@/lib/match/match-setup-plan";
import { grantCreatorScoringController } from "@/lib/scoring/grant-creator-controller";
import { applyScorerSessionCookie } from "@/lib/scoring/session-cookie";
import { matchSetupCreateSchema } from "@/lib/validation/match-setup";
import { createServiceRoleClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { ZodError } from "zod";

/** Public match creation from the Match Setup wizard (server-validated, service role). */
export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const json = (await request.json()) as Record<string, unknown>;

    const {
      data: { user },
    } = await supabase.auth.getUser();

    const match = await createMatchFromSetupPayload(json, user?.id ?? null);

    const admin = user ? await isAdmin(supabase) : false;
    if (admin && user) {
      const { scorer_pin_confirm: _confirm, ...body } = json;
      const input = matchSetupCreateSchema.parse(body);
      const xiCount = input.lineup.filter((e) => e.squad_status === "playing_xi").length;
      const guestCount = input.lineup.filter((e) => e.kind === "guest").length;
      const meta = matchMetadataFromSetup(
        input.red_wings_role,
        input.red_wings_innings,
      );

      try {
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
      } catch {
        /* audit optional if enum missing */
      }
    }

    revalidateTag(CACHE_TAGS.matches, "max");
    if (admin) {
      revalidateTag(CACHE_TAGS.adminAudit, "max");
    }

    const service = createServiceRoleClient();
    let sessionId: string;
    let token: string;
    try {
      ({ sessionId, token } = await grantCreatorScoringController(
        service,
        match.id,
        match.status,
      ));
    } catch {
      return NextResponse.json(
        {
          error:
            "The match was saved but scoring could not start. Open the match and enter your scorer PIN.",
          match_id: match.id,
          share_slug: match.share_slug,
        },
        { status: 503 },
      );
    }

    const { scorer_pin_hash: _hash, ...publicMatch } = match;
    const response = NextResponse.json(
      {
        match: publicMatch,
        scoring_role: "controller",
      },
      { status: 201 },
    );
    return applyScorerSessionCookie(response, sessionId, token);
  } catch (err) {
    if (err instanceof ZodError) {
      const first = err.issues[0]?.message ?? "Invalid match setup data";
      return NextResponse.json({ error: first }, { status: 400 });
    }
    const message = err instanceof Error ? err.message : "Invalid request";
    if (message.includes("duplicate") || message.includes("unique")) {
      return NextResponse.json(
        { error: "This match could not be saved because of duplicate data." },
        { status: 409 },
      );
    }
    return NextResponse.json(
      { error: "We could not create the match. Please try again." },
      { status: 500 },
    );
  }
}
