"use client";

import { useEffect } from "react";
import type { MutableRefObject } from "react";
import { deliveryRowToInput } from "@/lib/mappers/delivery";
import type { Delivery } from "@/lib/database/types";
import { buildInningsStateFromDeliveries } from "@/lib/scoring-engine/build-state";
import type { InningsScoreState } from "@/lib/scoring-engine/types";
import { mergeDeliveries } from "@/lib/scoring/merge-deliveries";
import { createClient } from "@/lib/supabase/client";

function rebuildFromMerged(
  merged: ReturnType<typeof mergeDeliveries>,
  oversLimit: number,
  target: number | null | undefined,
): InningsScoreState {
  return buildInningsStateFromDeliveries(merged, oversLimit, target ?? null);
}

/** Live-sync innings deliveries from Supabase Realtime (public read RLS). */
export function useInningsDeliveriesRealtime(options: {
  inningsId: string;
  matchId: string;
  enabled: boolean;
  hydrated: boolean;
  oversLimit: number;
  target: number | null | undefined;
  stateRef: MutableRefObject<InningsScoreState>;
  onRebuilt: (next: InningsScoreState) => void;
}) {
  const {
    inningsId,
    matchId,
    enabled,
    hydrated,
    oversLimit,
    target,
    stateRef,
    onRebuilt,
  } = options;

  useEffect(() => {
    if (!enabled || !hydrated || !inningsId) return;

    let supabase: ReturnType<typeof createClient> | null = null;
    try {
      supabase = createClient();
    } catch {
      return;
    }

    const mergeIncoming = (row: Delivery) => {
      if (row.innings_id !== inningsId) return;
      const incoming = deliveryRowToInput(row);
      const merged = mergeDeliveries(
        [incoming],
        stateRef.current.deliveries,
      );
      const next = rebuildFromMerged(merged, oversLimit, target);
      stateRef.current = next;
      onRebuilt(next);
    };

    const removeByClientEventId = (clientEventId: string | undefined) => {
      if (!clientEventId) return;
      const remaining = stateRef.current.deliveries.filter(
        (d) => d.clientEventId !== clientEventId,
      );
      if (remaining.length === stateRef.current.deliveries.length) return;
      const next = rebuildFromMerged(remaining, oversLimit, target);
      stateRef.current = next;
      onRebuilt(next);
    };

    const channel = supabase
      .channel(`rw-innings-deliveries:${matchId}:${inningsId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "deliveries",
          filter: `innings_id=eq.${inningsId}`,
        },
        (payload) => {
          const row = payload.new as Delivery;
          mergeIncoming(row);
        },
      )
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "deliveries",
          filter: `innings_id=eq.${inningsId}`,
        },
        (payload) => {
          const row = payload.new as Delivery;
          mergeIncoming(row);
        },
      )
      .on(
        "postgres_changes",
        {
          event: "DELETE",
          schema: "public",
          table: "deliveries",
          filter: `innings_id=eq.${inningsId}`,
        },
        (payload) => {
          const old = payload.old as { client_event_id?: string };
          removeByClientEventId(old.client_event_id);
        },
      )
      .subscribe();

    return () => {
      void supabase?.removeChannel(channel);
    };
  }, [
    enabled,
    hydrated,
    inningsId,
    matchId,
    onRebuilt,
    oversLimit,
    stateRef,
    target,
  ]);
}
