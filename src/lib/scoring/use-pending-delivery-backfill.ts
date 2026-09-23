"use client";

import { useCallback, useEffect, useState } from "react";
import {
  countRecoverableSyncItemsForMatch,
  createApiDeliveryPusher,
  flushSyncQueueUntilIdle,
  requeueRetryableFailedForMatch,
} from "@/lib/sync/delivery-sync";

/**
 * Background flush of Dexie pending deliveries for one match (controller + online only).
 * Does not block scoring UI; uses the existing delivery API.
 */
export function usePendingDeliveryBackfill(
  matchId: string,
  isController: boolean,
  isOnline: boolean,
) {
  const [pending, setPending] = useState(0);
  const [syncing, setSyncing] = useState(false);
  const [lastError, setLastError] = useState<string | null>(null);

  const refreshPending = useCallback(async () => {
    try {
      setPending(await countRecoverableSyncItemsForMatch(matchId));
    } catch {
      /* ignore */
    }
  }, [matchId]);

  const runBackfill = useCallback(async () => {
    if (!isController || !isOnline) return;
    setSyncing(true);
    setLastError(null);
    try {
      await requeueRetryableFailedForMatch(matchId);
      const result = await flushSyncQueueUntilIdle(
        await createApiDeliveryPusher(),
        { maxRounds: 20, matchId },
      );
      if (!result.ok) {
        setLastError(
          `${result.pending} delivery update(s) still pending after sync attempt.`,
        );
      }
    } catch (err) {
      setLastError(err instanceof Error ? err.message : "Sync failed");
    } finally {
      setSyncing(false);
      await refreshPending();
    }
  }, [isController, isOnline, matchId, refreshPending]);

  useEffect(() => {
    void refreshPending();
  }, [refreshPending]);

  useEffect(() => {
    if (!isController || !isOnline || pending === 0) return;
    void runBackfill();
    const id = window.setInterval(() => void runBackfill(), 8000);
    return () => window.clearInterval(id);
  }, [isController, isOnline, pending, runBackfill]);

  return { pending, syncing, lastError, refreshPending, runBackfill };
}
