"use client";

import type { ScoringBootstrap } from "@/lib/data/scoring-bootstrap-types";
import { getLocalDb } from "@/lib/local-db/schema";

export async function saveScoringBootstrapCache(
  bootstrap: ScoringBootstrap,
): Promise<void> {
  const db = getLocalDb();
  await db.scoringBootstrapCache.put({
    match_id: bootstrap.matchId,
    share_slug: bootstrap.shareSlug,
    bootstrap,
    updated_at: new Date().toISOString(),
  });
}

export async function loadScoringBootstrapCacheBySlug(
  shareSlug: string,
): Promise<ScoringBootstrap | null> {
  const db = getLocalDb();
  const row = await db.scoringBootstrapCache
    .where("share_slug")
    .equals(shareSlug)
    .first();
  return row?.bootstrap ?? null;
}

export async function loadScoringBootstrapCacheByMatchId(
  matchId: string,
): Promise<ScoringBootstrap | null> {
  const db = getLocalDb();
  const row = await db.scoringBootstrapCache.get(matchId);
  return row?.bootstrap ?? null;
}
