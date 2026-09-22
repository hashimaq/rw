import { NextResponse } from "next/server";
import { z } from "zod";
import {
  requireScoringControllerSession,
  ScoringAuthorizationError,
} from "@/lib/auth/scoring-session";
import { createServiceRoleClient } from "@/lib/supabase/admin";

const bodySchema = z.object({
  full_name: z.string().min(1).max(120),
});

export async function POST(request: Request) {
  try {
    const session = await requireScoringControllerSession();
    const json = await request.json();
    const { full_name } = bodySchema.parse(json);
    const name = full_name.trim().replace(/\s+/g, " ");
    if (!name) {
      return NextResponse.json({ error: "Name is required" }, { status: 400 });
    }

    const supabase = createServiceRoleClient();

    let { data: guest, error: guestError } = await supabase
      .from("players")
      .insert({
        full_name: name,
        jersey_number: null,
        is_active: true,
        is_official_squad: false,
      })
      .select("id, full_name")
      .single();

    if (
      guestError?.message?.includes("is_official_squad") ||
      guestError?.message?.includes("does not exist")
    ) {
      const legacy = await supabase
        .from("players")
        .insert({
          full_name: name,
          jersey_number: null,
          is_active: true,
        })
        .select("id, full_name")
        .single();
      guest = legacy.data;
      guestError = legacy.error;
    }

    if (guestError || !guest) {
      return NextResponse.json(
        { error: guestError?.message ?? "Could not create guest player" },
        { status: 500 },
      );
    }

    const { error: squadError } = await supabase.from("match_squads").insert({
      match_id: session.matchId,
      player_id: guest.id,
      squad_status: "bench",
      is_captain: false,
      is_wicketkeeper: false,
    });

    if (squadError) {
      await supabase.from("players").delete().eq("id", guest.id);
      return NextResponse.json(
        { error: squadError.message ?? "Could not add guest to match" },
        { status: 500 },
      );
    }

    return NextResponse.json({
      id: guest.id,
      name: guest.full_name,
      isGuest: true,
    });
  } catch (err) {
    if (err instanceof ScoringAuthorizationError) {
      return NextResponse.json({ error: err.message }, { status: 401 });
    }
    if (err instanceof z.ZodError) {
      return NextResponse.json({ error: "Invalid request" }, { status: 400 });
    }
    return NextResponse.json({ error: "Unexpected error" }, { status: 500 });
  }
}
