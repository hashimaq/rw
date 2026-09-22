import { NextResponse } from "next/server";
import { buildMatchSessionStatus } from "@/lib/scoring/session-status";
import { createClient } from "@/lib/supabase/server";

/** Public-safe: scorer session role for this browser (no secrets). */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const slug = searchParams.get("slug");
  if (!slug) {
    return NextResponse.json({ error: "slug required" }, { status: 400 });
  }

  const supabase = await createClient();
  const { data: match, error } = await supabase
    .from("matches")
    .select("id, status, opponent_name, match_number, overs_limit")
    .eq("share_slug", slug)
    .maybeSingle();

  if (error || !match) {
    return NextResponse.json({ error: "Match not found" }, { status: 404 });
  }

  const payload = await buildMatchSessionStatus(match);
  return NextResponse.json(payload);
}
