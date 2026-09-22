import { revalidateTag } from "next/cache";
import { NextResponse } from "next/server";
import { recordAdminAuditEvent } from "@/lib/audit/record";
import { playerAuditSnapshot } from "@/lib/audit/player-snapshot";
import { requireAdmin } from "@/lib/auth/admin";
import { CACHE_TAGS } from "@/lib/cache/tags";
import { findSimilarPlayerNames } from "@/lib/players/normalize-name";
import { PlayersRepository } from "@/lib/repositories/players.repository";
import { createPlayerSchema } from "@/lib/validation/player";
import { createClient } from "@/lib/supabase/server";

export async function GET() {
  try {
    const supabase = await createClient();
    await requireAdmin(supabase);
    const repo = new PlayersRepository(supabase);
    const players = await repo.listOfficial(true);
    return NextResponse.json({ players });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Request failed";
    const status = message.includes("Admin") ? 403 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    await requireAdmin(supabase);

    const json = await request.json();
    const input = createPlayerSchema.parse(json);

    const repo = new PlayersRepository(supabase);
    const existing = await repo.listOfficial(true);
    const similar = findSimilarPlayerNames(input.full_name, existing);
    if (similar.length > 0) {
      return NextResponse.json(
        {
          error: "duplicate_player",
          message:
            "A player with a very similar name already exists. Review before creating a duplicate.",
          similar,
        },
        { status: 409 },
      );
    }

    if (
      input.jersey_number != null &&
      existing.some(
        (p) =>
          p.is_active &&
          !p.archived_at &&
          p.jersey_number === input.jersey_number,
      )
    ) {
      return NextResponse.json(
        {
          error: "jersey_taken",
          message: "This jersey number is already used by an active player.",
        },
        { status: 409 },
      );
    }

    const player = await repo.create(input);
    await recordAdminAuditEvent(supabase, {
      action: "PLAYER_CREATED",
      entity_type: "player",
      entity_id: player.id,
      new_data: playerAuditSnapshot(player),
    });
    revalidateTag(CACHE_TAGS.players, "max");
    revalidateTag(CACHE_TAGS.adminAudit, "max");
    return NextResponse.json({ player }, { status: 201 });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Invalid request";
    const status = message.includes("Admin")
      ? 403
      : message.includes("parse")
        ? 400
        : 400;
    return NextResponse.json({ error: message }, { status });
  }
}
