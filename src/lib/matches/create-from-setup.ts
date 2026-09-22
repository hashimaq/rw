import "server-only";
import { hashScorerPin } from "@/lib/auth/scorer-pin";
import { MatchesRepository } from "@/lib/repositories/matches.repository";
import { matchSetupCreateSchema } from "@/lib/validation/match-setup";
import { createServiceRoleClient } from "@/lib/supabase/admin";
import type { Match } from "@/lib/database/types";

export async function createMatchFromSetupPayload(
  json: Record<string, unknown>,
  createdByUserId: string | null,
): Promise<Match> {
  const { scorer_pin_confirm: _confirm, ...body } = json;
  const input = matchSetupCreateSchema.parse(body);
  const pinHash = await hashScorerPin(input.scorer_pin);

  const service = createServiceRoleClient();
  const repo = new MatchesRepository(service);
  const match = await repo.createFullSetup(input, pinHash, createdByUserId);
  return match;
}
