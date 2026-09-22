"use client";

import { getLocalDb } from "@/lib/local-db/schema";
import type { DeliveryInputPayload } from "@/lib/validation/delivery";

const now = () => new Date().toISOString();

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

export async function flushSyncQueue(
  push: (payload: DeliveryInputPayload) => Promise<void>,
) {
  const db = getLocalDb();
  const pending = await db.syncQueue
    .where("status")
    .equals("pending")
    .sortBy("created_at");

  for (const item of pending) {
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
      const matchRemoved = message.startsWith("match_removed:");
      const lostControl =
        message.includes("not the active scoring controller") ||
        message.includes("not_scoring_controller");
      await db.syncQueue.update(item.id!, {
        status: lostControl || matchRemoved ? "failed" : "pending",
        attempts: item.attempts + 1,
        last_error: matchRemoved
          ? "This match was deleted. Pending updates were discarded."
          : lostControl
            ? "Scoring control moved to another device. These updates were not applied."
            : message,
        updated_at: now(),
      });
    }
  }
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
      throw new Error(
        code === "not_scoring_controller"
          ? "This device is not the active scoring controller"
          : detail,
      );
    }
  };
}
