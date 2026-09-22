import { NextResponse } from "next/server";
import { z } from "zod";
import {
  requireScoringControllerSession,
  ScoringAuthorizationError,
} from "@/lib/auth/scoring-session";
import { createServiceRoleClient } from "@/lib/supabase/admin";

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

    const current = inningsList[inningsList.length - 1];
    if (current.innings_status !== "completed") {
      return NextResponse.json(
        { error: "Current innings is not complete yet" },
        { status: 409 },
      );
    }

    if (inningsList.length >= 2) {
      return NextResponse.json(
        { error: "Second innings already exists" },
        { status: 409 },
      );
    }

    const target = current.total_runs + 1;
    const battingTeam =
      current.batting_team === "red_wings" ? "opponent" : "red_wings";
    const bowlingTeam =
      current.bowling_team === "red_wings" ? "opponent" : "red_wings";

    const { data: created, error: insertError } = await supabase
      .from("innings")
      .insert({
        match_id: matchId,
        innings_number: 2,
        batting_team: battingTeam,
        bowling_team: bowlingTeam,
        overs_limit: current.overs_limit,
        target,
        innings_status: "not_started",
      })
      .select("id, innings_number, batting_team, bowling_team, target, overs_limit, innings_status")
      .single();

    if (insertError || !created) {
      return NextResponse.json(
        { error: insertError?.message ?? "Could not start innings 2" },
        { status: 500 },
      );
    }

    return NextResponse.json({ innings: created });
  } catch (err) {
    if (err instanceof ScoringAuthorizationError) {
      return NextResponse.json({ error: err.message }, { status: 401 });
    }
    const message = err instanceof Error ? err.message : "Invalid request";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
