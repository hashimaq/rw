"use client";

import { useEffect, useRef } from "react";
import { createClient } from "@/lib/supabase/client";
import {
  cancelDeliveryCommentaryPlayback,
  configureCommentaryPlaybackBaseline,
  enqueueDeliveryCommentaryReady,
} from "@/lib/commentary/delivery-commentary-audio-queue";
import {
  getCommentaryPlaybackBaselineSequence,
  initCommentaryPlaybackBaselineOnce,
} from "@/lib/commentary/commentary-playback-session";

type CommentaryRow = {
  client_event_id: string;
  match_id: string;
  innings_id: string;
  sequence_in_innings: number;
  status: string;
};

function handleReadyRow(row: CommentaryRow): void {
  if (row.status !== "ready") return;
  const baseline = getCommentaryPlaybackBaselineSequence();
  if (row.sequence_in_innings < baseline) return;
  enqueueDeliveryCommentaryReady({
    clientEventId: row.client_event_id,
    inningsId: row.innings_id,
    sequenceInInnings: row.sequence_in_innings,
  });
}

/** Subscribes to ready ball commentary for playback (no UI). */
export function useDeliveryCommentaryPlayback(options: {
  matchId: string;
  inningsId: string | null;
  enabled: boolean;
  minSequenceInInnings?: number;
}): void {
  const { matchId, inningsId, enabled, minSequenceInInnings = 1 } = options;
  const lastInningsIdRef = useRef<string | null>(null);

  useEffect(() => {
    if (!enabled || !inningsId) return;
    initCommentaryPlaybackBaselineOnce(
      inningsId,
      minSequenceInInnings,
      lastInningsIdRef,
    );
    configureCommentaryPlaybackBaseline({
      minSequenceInInnings: getCommentaryPlaybackBaselineSequence(),
      inningsId,
    });
  }, [enabled, inningsId, minSequenceInInnings]);

  useEffect(() => {
    if (!enabled || !matchId || !inningsId) return;

    let supabase: ReturnType<typeof createClient> | null = null;
    try {
      supabase = createClient();
    } catch {
      return;
    }

    void supabase
      .from("delivery_commentary")
      .select(
        "client_event_id, match_id, innings_id, sequence_in_innings, status",
      )
      .eq("match_id", matchId)
      .eq("innings_id", inningsId)
      .eq("status", "ready")
      .order("sequence_in_innings", { ascending: true })
      .then(({ data }) => {
        for (const row of data ?? []) {
          handleReadyRow(row as CommentaryRow);
        }
      });

    const channel = supabase
      .channel(`rw-delivery-commentary:${matchId}:${inningsId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "delivery_commentary",
          filter: `match_id=eq.${matchId}`,
        },
        (payload) => {
          const row = payload.new as CommentaryRow;
          if (row.innings_id !== inningsId) return;
          handleReadyRow(row);
        },
      )
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "delivery_commentary",
          filter: `match_id=eq.${matchId}`,
        },
        (payload) => {
          const row = payload.new as CommentaryRow;
          if (row.innings_id !== inningsId) return;
          handleReadyRow(row);
        },
      )
      .subscribe();

    const undoChannel = supabase
      .channel(`rw-delivery-commentary-undo:${matchId}:${inningsId}`)
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
          if (old.client_event_id) {
            cancelDeliveryCommentaryPlayback(old.client_event_id);
          }
        },
      )
      .subscribe();

    return () => {
      void supabase?.removeChannel(channel);
      void supabase?.removeChannel(undoChannel);
    };
  }, [enabled, inningsId, matchId]);
}
