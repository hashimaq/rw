"use client";

export type CommentaryClientLatencyStage =
  | "delivery_committed_local"
  | "metadata_received"
  | "audio_fetch_started"
  | "audio_fetch_done"
  | "playback_started";

function enabled(): boolean {
  return process.env.NEXT_PUBLIC_DELIVERY_COMMENTARY_LATENCY_LOG === "1";
}

export function logCommentaryClientLatency(event: {
  clientEventId: string;
  stage: CommentaryClientLatencyStage;
  atMs?: number;
  deliveryCommittedAtMs?: number;
  sequenceInInnings?: number;
  extra?: Record<string, number | string | boolean | null>;
}): void {
  if (!enabled()) return;
  const atMs = event.atMs ?? Date.now();
  const deltaMs =
    event.deliveryCommittedAtMs != null
      ? atMs - event.deliveryCommittedAtMs
      : undefined;
  console.info(
    "[commentary-latency-client]",
    JSON.stringify({
      ...event,
      atMs,
      deltaFromDeliveryMs: deltaMs,
    }),
  );
}

const localCommitTimes = new Map<string, number>();

export function registerLocalDeliveryCommit(
  clientEventId: string,
  committedAtMs: number,
  sequenceInInnings?: number,
): void {
  localCommitTimes.set(clientEventId, committedAtMs);
  logCommentaryClientLatency({
    clientEventId,
    stage: "delivery_committed_local",
    atMs: committedAtMs,
    deliveryCommittedAtMs: committedAtMs,
    sequenceInInnings,
  });
}

export function deliveryCommittedAtForClientEvent(
  clientEventId: string,
): number | undefined {
  return localCommitTimes.get(clientEventId);
}
