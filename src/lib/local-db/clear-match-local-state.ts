"use client";

import { getLocalDb } from "@/lib/local-db/schema";

/** Drop offline deliveries/sync queue for a deleted match so sync cannot resurrect it. */
export async function clearMatchLocalState(matchId: string): Promise<void> {
  if (typeof window === "undefined") return;
  const db = getLocalDb();
  await db.transaction(
    "rw",
    [db.deliveries, db.syncQueue, db.matches, db.scoringBootstrapCache],
    async () => {
      await db.deliveries.where("match_id").equals(matchId).delete();
      await db.syncQueue.where("match_id").equals(matchId).delete();
      await db.matches.delete(matchId);
      await db.scoringBootstrapCache.delete(matchId);
    },
  );
}
