import Dexie, { type EntityTable } from "dexie";
import type { ScoringBootstrap } from "@/lib/data/scoring-bootstrap-types";
import type { DeliveryInputPayload } from "@/lib/validation/delivery";

export type SyncQueueStatus = "pending" | "syncing" | "synced" | "failed";

export interface LocalDeliveryRecord extends DeliveryInputPayload {
  id?: number;
  match_id: string;
  synced: boolean;
  created_at: string;
}

export interface SyncQueueItem {
  id?: number;
  client_event_id: string;
  match_id: string;
  innings_id: string;
  payload: DeliveryInputPayload;
  status: SyncQueueStatus;
  attempts: number;
  last_error: string | null;
  created_at: string;
  updated_at: string;
}

export interface LocalMatchMeta {
  match_id: string;
  share_slug: string | null;
  opponent_name: string;
  status: string;
  updated_at: string;
}

export interface LocalScoringBootstrapCache {
  match_id: string;
  share_slug: string;
  bootstrap: ScoringBootstrap;
  updated_at: string;
}

export class RedWingsLocalDb extends Dexie {
  deliveries!: EntityTable<LocalDeliveryRecord, "id">;
  syncQueue!: EntityTable<SyncQueueItem, "id">;
  matches!: EntityTable<LocalMatchMeta, "match_id">;
  scoringBootstrapCache!: EntityTable<
    LocalScoringBootstrapCache,
    "match_id"
  >;

  constructor() {
    super("red_wings_cricket");

    this.version(1).stores({
      deliveries:
        "++id, client_event_id, match_id, innings_id, synced, created_at",
      syncQueue:
        "++id, client_event_id, match_id, status, created_at, [match_id+status]",
      matches: "match_id, share_slug, updated_at",
    });

    this.version(2).stores({
      deliveries:
        "++id, client_event_id, match_id, innings_id, synced, created_at",
      syncQueue:
        "++id, client_event_id, match_id, status, created_at, [match_id+status]",
      matches: "match_id, share_slug, updated_at",
      scoringBootstrapCache: "match_id, share_slug, updated_at",
    });
  }
}

let dbInstance: RedWingsLocalDb | null = null;

export function getLocalDb(): RedWingsLocalDb {
  if (typeof window === "undefined") {
    throw new Error("IndexedDB is only available in the browser");
  }
  if (!dbInstance) {
    dbInstance = new RedWingsLocalDb();
  }
  return dbInstance;
}
