"use client";

import { getLocalDb } from "@/lib/local-db/schema";

export async function undoDeliveryLocal(clientEventId: string) {
  const db = getLocalDb();
  await db.transaction("rw", [db.deliveries, db.syncQueue], async () => {
    await db.deliveries.where("client_event_id").equals(clientEventId).delete();
    await db.syncQueue
      .where("client_event_id")
      .equals(clientEventId)
      .delete();
  });
}

export async function createApiUndoPusher() {
  return async (clientEventId: string) => {
    const res = await fetch("/api/scoring/undo-delivery", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ client_event_id: clientEventId }),
    });
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      throw new Error(body.error ?? `Undo failed (${res.status})`);
    }
  };
}
