"use client";

import { logCommentaryClientLatency } from "@/lib/commentary/commentary-latency-client";
import { enqueueDeliveryCommentaryReady } from "@/lib/commentary/delivery-commentary-audio-queue";
import type { DeliveryInputPayload } from "@/lib/validation/delivery";

const watchesInFlight = new Set<string>();

function statusUrl(clientEventId: string): string {
  return `/api/scoring/delivery-commentary/${encodeURIComponent(clientEventId)}/status`;
}

/**
 * Controller-only: start commentary as soon as the ball is committed locally,
 * then poll status (not Realtime) until audio is ready for playback.
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
      const scheduleRes = await fetch("/api/scoring/delivery-commentary/schedule", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...options.payload,
          delivery_committed_at_ms: options.deliveryCommittedAtMs,
        }),
      });
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

      const deadline = Date.now() + 45_000;
      let delayMs = 50;
      while (Date.now() < deadline) {
        const statusRequestUrl = statusUrl(clientEventId);
        const res = await fetch(statusRequestUrl, {
          credentials: "include",
        });
        if (res.ok) {
          const json = (await res.json()) as {
            status?: string;
            ready?: boolean;
            innings_id?: string;
            sequence_in_innings?: number;
            error_message?: string | null;
            error?: string;
            code?: string;
          };
          if (json.ready && json.innings_id && json.sequence_in_innings != null) {
            logCommentaryClientLatency({
              clientEventId,
              stage: "metadata_received",
              deliveryCommittedAtMs: options.deliveryCommittedAtMs,
              sequenceInInnings: json.sequence_in_innings,
              extra: { kind: "controller_status_ready" },
            });
            enqueueDeliveryCommentaryReady({
              clientEventId,
              inningsId: json.innings_id,
              sequenceInInnings: json.sequence_in_innings,
            });
            return;
          }
          if (json.status === "failed") {
            logCommentaryClientLatency({
              clientEventId,
              stage: "metadata_received",
              deliveryCommittedAtMs: options.deliveryCommittedAtMs,
              extra: {
                kind: "controller_status_failed",
                statusUrl: statusRequestUrl,
                httpStatus: res.status,
                dbStatus: json.status,
                error_message: json.error_message ?? json.error ?? null,
                code: json.code ?? null,
              },
            });
            return;
          }
        } else {
          const errBody = (await res.json().catch(() => ({}))) as {
            error?: string;
            code?: string;
          };
          logCommentaryClientLatency({
            clientEventId,
            stage: "metadata_received",
            extra: {
              kind: "controller_status_http_error",
              statusUrl: statusRequestUrl,
              httpStatus: res.status,
              error: errBody.error ?? null,
              code: errBody.code ?? null,
            },
          });
        }
        await new Promise<void>((resolve) => {
          window.setTimeout(resolve, delayMs);
        });
        delayMs = Math.min(Math.round(delayMs * 1.15), 180);
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
