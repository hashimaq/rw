"use client";

import { logCommentaryClientLatency } from "@/lib/commentary/commentary-latency-client";
import {
  enqueueCommentaryForPlayback,
  isCommentaryPlaybackComplete,
  isCommentarySupersededForScorer,
  markCommentaryAudioKnownReady,
} from "@/lib/commentary/delivery-commentary-audio-queue";
import type { DeliveryInputPayload } from "@/lib/validation/delivery";

const watchesInFlight = new Set<string>();

function waitReadyUrl(clientEventId: string): string {
  return `/api/scoring/delivery-commentary/${encodeURIComponent(clientEventId)}/wait-ready`;
}

/**
 * Controller-only: schedule + long-poll wait-ready (no client status backoff).
 */
export function startControllerCommentaryFastPath(options: {
  payload: DeliveryInputPayload;
  deliveryCommittedAtMs?: number;
}): void {
  if (typeof window === "undefined") return;
  const clientEventId = options.payload.client_event_id;
  if (watchesInFlight.has(clientEventId)) return;
  watchesInFlight.add(clientEventId);

  void (async () => {
    try {
      const schedulePromise = fetch("/api/scoring/delivery-commentary/schedule", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...options.payload,
          delivery_committed_at_ms: options.deliveryCommittedAtMs,
        }),
      });

      const waitPromise = fetch(waitReadyUrl(clientEventId), {
        credentials: "include",
      });

      const [scheduleRes, waitRes] = await Promise.all([
        schedulePromise,
        waitPromise,
      ]);

      const scheduleBody = (await scheduleRes.json().catch(() => ({}))) as {
        error?: string;
        code?: string;
        skipped?: boolean;
        scheduled?: boolean;
      };
      logCommentaryClientLatency({
        clientEventId,
        stage: "metadata_received",
        deliveryCommittedAtMs: options.deliveryCommittedAtMs,
        extra: {
          kind: "controller_schedule_response",
          httpStatus: scheduleRes.status,
          ok: scheduleRes.ok,
          skipped: scheduleBody.skipped ?? null,
          scheduled: scheduleBody.scheduled ?? null,
          error: scheduleBody.error ?? null,
          code: scheduleBody.code ?? null,
        },
      });

      if (isCommentaryPlaybackComplete(clientEventId)) {
        return;
      }

      if (!waitRes.ok && waitRes.status !== 408) {
        logCommentaryClientLatency({
          clientEventId,
          stage: "metadata_received",
          deliveryCommittedAtMs: options.deliveryCommittedAtMs,
          extra: {
            kind: "controller_wait_ready_http_error",
            httpStatus: waitRes.status,
          },
        });
        return;
      }

      const json = (await waitRes.json().catch(() => ({}))) as {
        ready?: boolean;
        status?: string;
        innings_id?: string;
        sequence_in_innings?: number;
        error_message?: string | null;
      };

      if (json.status === "failed") {
        logCommentaryClientLatency({
          clientEventId,
          stage: "metadata_received",
          deliveryCommittedAtMs: options.deliveryCommittedAtMs,
          extra: {
            kind: "controller_wait_ready_failed",
            error_message: json.error_message ?? null,
          },
        });
        return;
      }

      if (
        json.ready &&
        json.innings_id &&
        json.sequence_in_innings != null
      ) {
        if (isCommentaryPlaybackComplete(clientEventId)) {
          return;
        }
        if (
          isCommentarySupersededForScorer(
            clientEventId,
            json.sequence_in_innings,
          )
        ) {
          logCommentaryClientLatency({
            clientEventId,
            stage: "metadata_received",
            deliveryCommittedAtMs: options.deliveryCommittedAtMs,
            sequenceInInnings: json.sequence_in_innings,
            extra: { kind: "controller_wait_ready_superseded" },
          });
          return;
        }
        logCommentaryClientLatency({
          clientEventId,
          stage: "metadata_received",
          deliveryCommittedAtMs: options.deliveryCommittedAtMs,
          sequenceInInnings: json.sequence_in_innings,
          extra: { kind: "controller_wait_ready" },
        });
        markCommentaryAudioKnownReady(clientEventId);
        enqueueCommentaryForPlayback({
          clientEventId,
          inningsId: json.innings_id,
          sequenceInInnings: json.sequence_in_innings,
        });
      }
    } finally {
      watchesInFlight.delete(clientEventId);
    }
  })();
}

/** Test helper */
export function controllerCommentaryWatchInFlightForTests(): Set<string> {
  return watchesInFlight;
}
