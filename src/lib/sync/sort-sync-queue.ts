import type { SyncQueueItem } from "@/lib/local-db/schema";

/** Apply deliveries in innings order so server-side validation matches live scoring. */
export function sortSyncQueueItems(items: SyncQueueItem[]): SyncQueueItem[] {
  return [...items].sort((a, b) => {
    const inn = a.innings_id.localeCompare(b.innings_id);
    if (inn !== 0) return inn;
    return a.payload.sequence_in_innings - b.payload.sequence_in_innings;
  });
}
