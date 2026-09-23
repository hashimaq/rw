import { NextResponse } from "next/server";
import { z } from "zod";
import {
  requireScoringControllerSession,
  ScoringAuthorizationError,
} from "@/lib/auth/scoring-session";
import { createServiceRoleClient } from "@/lib/supabase/admin";
import { planStartSecondInnings } from "@/lib/scoring/second-innings-transition";

const bodySchema = z.object({
  match_id: z.string().uuid(),
});

export async function POST(request: Request) {
  try {
    const json = await request.json();
    const { match_id: matchId } = bodySchema.parse(json);
    const session = await requireScoringControllerSession();

    if (session.matchId !== matchId) {
      return NextResponse.json({ error: "Match mismatch" }, { status: 403 });
    }

    const supabase = createServiceRoleClient();

    const { data: inningsList, error: listError } = await supabase
      .from("innings")
      .select("*")
      .eq("match_id", matchId)
      .order("innings_number", { ascending: true });

    if (listError || !inningsList?.length) {
      return NextResponse.json({ error: "Innings not found" }, { status: 404 });
    }

    const plan = planStartSecondInnings(inningsList);
    if (plan.kind === "error") {
      return NextResponse.json({ error: plan.message }, { status: plan.status });
    }
    if (plan.kind === "existing") {
      return NextResponse.json({
        innings: plan.innings,
        already_started: true,
      });
    }

    const { data: created, error: insertError } = await supabase
      .from("innings")
      .insert({
        match_id: matchId,
        innings_number: 2,
        batting_team: plan.battingTeam,
        bowling_team: plan.bowlingTeam,
        overs_limit: plan.oversLimit,
        target: plan.target,
        innings_status: "not_started",
      })
      .select(
        "id, innings_number, batting_team, bowling_team, target, overs_limit, innings_status",
      )
      .single();

    if (insertError || !created) {
      return NextResponse.json(
        { error: insertError?.message ?? "Could not start innings 2" },
        { status: 500 },
      );
    }

    return NextResponse.json({ innings: created, already_started: false });
  } catch (err) {
    if (err instanceof ScoringAuthorizationError) {
      return NextResponse.json({ error: err.message }, { status: 401 });
    }
    const message = err instanceof Error ? err.message : "Invalid request";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
