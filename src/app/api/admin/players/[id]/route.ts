import { revalidateTag } from "next/cache";
import { NextResponse } from "next/server";
import { recordAdminAuditEvent } from "@/lib/audit/record";
import { playerAuditDiff } from "@/lib/audit/player-snapshot";
import { requireAdmin } from "@/lib/auth/admin";
import { CACHE_TAGS } from "@/lib/cache/tags";
import { findSimilarPlayerNames } from "@/lib/players/normalize-name";
import { PlayersRepository } from "@/lib/repositories/players.repository";
import { updatePlayerSchema } from "@/lib/validation/player";
import { createClient } from "@/lib/supabase/server";

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function PATCH(request: Request, context: RouteContext) {
  try {
    const { id } = await context.params;
    const supabase = await createClient();
    await requireAdmin(supabase);

    const json = await request.json();
    const input = updatePlayerSchema.parse(json);
    const repo = new PlayersRepository(supabase);

    const current = await repo.getById(id);
    if (!current) {
      return NextResponse.json({ error: "Player not found" }, { status: 404 });
    }

    const roster = await repo.listOfficial(true);

    if (input.full_name) {
      const similar = findSimilarPlayerNames(input.full_name, roster, id);
      if (similar.length > 0) {
        return NextResponse.json(
          {
            error: "duplicate_player",
            message:
              "Another player with a very similar name exists. Review before saving.",
            similar,
          },
          { status: 409 },
        );
      }
    }

    if (input.jersey_number != null) {
      const jerseyTaken = roster.some(
        (p) =>
          p.id !== id &&
          p.is_active &&
          !p.archived_at &&
          p.jersey_number === input.jersey_number,
      );
      if (jerseyTaken) {
        return NextResponse.json(
          {
            error: "jersey_taken",
            message: "This jersey number is already used by an active player.",
          },
          { status: 409 },
        );
      }
    }

    const player = await repo.update(id, input);
    const diff = playerAuditDiff(current, player);
    await recordAdminAuditEvent(supabase, {
      action: "PLAYER_UPDATED",
      entity_type: "player",
      entity_id: player.id,
      previous_data: diff.previous,
      new_data: diff.next,
    });
    revalidateTag(CACHE_TAGS.players, "max");
    revalidateTag(CACHE_TAGS.adminAudit, "max");
    return NextResponse.json({ player });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Invalid request";
    const status = message.includes("Admin") ? 403 : 400;
    return NextResponse.json({ error: message }, { status });
  }
}
