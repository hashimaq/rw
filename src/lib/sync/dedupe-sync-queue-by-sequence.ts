import type { SyncQueueItem } from "@/lib/local-db/schema";
import { sortSyncQueueItems } from "@/lib/sync/sort-sync-queue";

/** Keep the latest pending row per (innings, sequence) — drops stale undo/rescore duplicates. */
export function dedupeSyncQueueBySequence(
  items: SyncQueueItem[],
): SyncQueueItem[] {
  const sorted = sortSyncQueueItems(items);
  const bySequence = new Map<string, SyncQueueItem>();
  for (const item of sorted) {
    const key = `${item.innings_id}:${item.payload.sequence_in_innings}`;
    const prev = bySequence.get(key);
    if (!prev || item.created_at >= prev.created_at) {
      bySequence.set(key, item);
    }
  }
  return sortSyncQueueItems([...bySequence.values()]);
}
