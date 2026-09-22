import { revalidateTag } from "next/cache";
import { NextResponse } from "next/server";
import { z } from "zod";
import { recordAdminAuditEvent } from "@/lib/audit/record";
import { playerAuditSnapshot } from "@/lib/audit/player-snapshot";
import { requireAdmin } from "@/lib/auth/admin";
import { CACHE_TAGS } from "@/lib/cache/tags";
import { PlayersRepository } from "@/lib/repositories/players.repository";
import { createClient } from "@/lib/supabase/server";

interface RouteContext {
  params: Promise<{ id: string }>;
}

const bodySchema = z.object({
  is_active: z.boolean(),
});

export async function PATCH(request: Request, context: RouteContext) {
  try {
    const { id } = await context.params;
    const supabase = await createClient();
    await requireAdmin(supabase);

    const json = await request.json();
    const { is_active } = bodySchema.parse(json);
    const repo = new PlayersRepository(supabase);

    const current = await repo.getById(id);
    if (!current) {
      return NextResponse.json({ error: "Player not found" }, { status: 404 });
    }

    const player = await repo.setActive(id, is_active);
    await recordAdminAuditEvent(supabase, {
      action: is_active ? "PLAYER_REACTIVATED" : "PLAYER_DEACTIVATED",
      entity_type: "player",
      entity_id: player.id,
      previous_data: playerAuditSnapshot(current),
      new_data: playerAuditSnapshot(player),
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
