"use client";

import { getLocalDb, type SyncQueueItem } from "@/lib/local-db/schema";
import type { DeliveryInputPayload } from "@/lib/validation/delivery";
import {
  deliverySyncFailureOutcome,
  isNonRetryableSyncError,
} from "@/lib/sync/delivery-sync-outcome";
import { sortSyncQueueItems } from "@/lib/sync/sort-sync-queue";

export { isNonRetryableSyncError } from "@/lib/sync/delivery-sync-outcome";

const now = () => new Date().toISOString();

export type FlushSyncQueueOptions = {
  /** When set, only queue rows for this match are flushed (avoids cross-match 403). */
  matchId?: string;
};

export type FlushSyncQueueUntilIdleOptions = FlushSyncQueueOptions & {
  maxRounds?: number;
};

/**
 * Local-first delivery write: persist immediately, queue for background Supabase sync.
 */
export async function recordDeliveryLocalFirst(
  matchId: string,
  payload: DeliveryInputPayload,
) {
  const db = getLocalDb();

  await db.transaction("rw", [db.deliveries, db.syncQueue], async () => {
    const existing = await db.deliveries
      .where("client_event_id")
      .equals(payload.client_event_id)
      .first();
    if (existing) return;

    await db.deliveries.add({
      ...payload,
      match_id: matchId,
      synced: false,
      created_at: now(),
    });

    await db.syncQueue.add({
      client_event_id: payload.client_event_id,
      match_id: matchId,
      innings_id: payload.innings_id,
      payload,
      status: "pending",
      attempts: 0,
      last_error: null,
      created_at: now(),
      updated_at: now(),
    });
  });
}

export async function countPendingSyncItems(
  matchId?: string,
): Promise<number> {
  const db = getLocalDb();
  if (matchId) {
    return db.syncQueue
      .where("match_id")
      .equals(matchId)
      .filter((row) => row.status === "pending")
      .count();
  }
  return db.syncQueue.where("status").equals("pending").count();
}

export async function countPendingSyncItemsForMatch(
  matchId: string,
): Promise<number> {
  return countPendingSyncItems(matchId);
}

/** Pending plus failed rows that can be retried (e.g. after FK/session fix). */
export async function countRecoverableSyncItemsForMatch(
  matchId: string,
): Promise<number> {
  const db = getLocalDb();
  const rows = await db.syncQueue.where("match_id").equals(matchId).toArray();
  return rows.filter(
    (row) =>
      row.status === "pending" ||
      (row.status === "failed" && !isNonRetryableSyncError(row.last_error)),
  ).length;
}

/** Set failed queue rows back to pending for one match (recovery only). */
export async function requeueRetryableFailedForMatch(
  matchId: string,
): Promise<number> {
  const db = getLocalDb();
  const failed = await db.syncQueue
    .where("match_id")
    .equals(matchId)
    .filter((row) => row.status === "failed")
    .toArray();
  let n = 0;
  for (const row of failed) {
    if (isNonRetryableSyncError(row.last_error)) continue;
    await db.syncQueue.update(row.id!, {
      status: "pending",
      updated_at: now(),
    });
    n++;
  }
  return n;
}

async function loadPendingSyncItems(
  matchId?: string,
): Promise<SyncQueueItem[]> {
  const db = getLocalDb();
  if (matchId) {
    return db.syncQueue
      .where("match_id")
      .equals(matchId)
      .filter((row) => row.status === "pending")
      .toArray();
  }
  return db.syncQueue.where("status").equals("pending").toArray();
}

/** One active flush at a time — concurrent Save/interval/backfill share this chain. */
let flushChain: Promise<void> = Promise.resolve();

function runSerializedFlush<T>(work: () => Promise<T>): Promise<T> {
  const next = flushChain.then(work, work);
  flushChain = next.then(
    () => undefined,
    () => undefined,
  );
  return next;
}

/** For tests: reset flush serialization between cases. */
export function resetDeliveryFlushSerializationForTests(): void {
  flushChain = Promise.resolve();
}

/** Flush pending deliveries; retry until idle or max rounds (e.g. before innings complete). */
export async function flushSyncQueueUntilIdle(
  push: (payload: DeliveryInputPayload) => Promise<void>,
  options: FlushSyncQueueUntilIdleOptions = {},
): Promise<{ ok: true } | { ok: false; pending: number }> {
  const maxRounds = options.maxRounds ?? 12;
  const matchId = options.matchId;
  for (let round = 0; round < maxRounds; round++) {
    await flushSyncQueue(push, { matchId });
    const pending = await countPendingSyncItems(matchId);
    if (pending === 0) return { ok: true };
  }
  return { ok: false, pending: await countPendingSyncItems(matchId) };
}

async function flushSyncQueueInner(
  push: (payload: DeliveryInputPayload) => Promise<void>,
  options: FlushSyncQueueOptions = {},
) {
  const pending = sortSyncQueueItems(await loadPendingSyncItems(options.matchId));

  for (const item of pending) {
    await dbSyncOneItem(item, push);
  }
}

async function dbSyncOneItem(
  item: SyncQueueItem,
  push: (payload: DeliveryInputPayload) => Promise<void>,
) {
  const db = getLocalDb();
  const fresh = await db.syncQueue.get(item.id!);
  if (!fresh || fresh.status !== "pending") return;

  await db.syncQueue.update(item.id!, {
    status: "syncing",
    updated_at: now(),
  });
  try {
    await push(item.payload);
    await db.syncQueue.update(item.id!, {
      status: "synced",
      updated_at: now(),
    });
    await db.deliveries
      .where("client_event_id")
      .equals(item.client_event_id)
      .modify({ synced: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Sync failed";
    const outcome = deliverySyncFailureOutcome(message);
    await db.syncQueue.update(item.id!, {
      status: outcome.status,
      attempts: item.attempts + 1,
      last_error: outcome.last_error,
      updated_at: now(),
    });
  }
}

export async function flushSyncQueue(
  push: (payload: DeliveryInputPayload) => Promise<void>,
  options: FlushSyncQueueOptions = {},
) {
  return runSerializedFlush(() => flushSyncQueueInner(push, options));
}

export async function createApiDeliveryPusher() {
  return async (payload: DeliveryInputPayload) => {
    const res = await fetch("/api/scoring/deliveries", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
      credentials: "include",
    });
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      const code = typeof body.code === "string" ? body.code : "";
      const detail = body.error ?? `Sync failed (${res.status})`;
      if (
        res.status === 404 &&
        (code === "not_found" ||
          detail.toLowerCase().includes("innings not found") ||
          detail.toLowerCase().includes("match"))
      ) {
        throw new Error("match_removed:This match was deleted and cannot receive updates.");
      }
      if (code === "not_scoring_controller") {
        throw new Error("This device is not the active scoring controller");
      }
      if (code === "session_required" || code === "session_invalid") {
        throw new Error(
          `${detail} (re-enter scorer PIN on this device, then reopen scoring)`,
        );
      }
      throw new Error(detail);
    }
  };
}
