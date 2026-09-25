import "server-only";

export type CommentaryLatencyStage =
  | "delivery_committed"
  | "job_scheduled"
  | "db_row_inserted"
  | "job_claimed"
  | "gemini_text_started"
  | "gemini_text_done"
  | "gemini_tts_started"
  | "gemini_tts_done"
  | "wav_ready"
  | "ephemeral_cache_set"
  | "db_ready"
  | "storage_upload_started"
  | "storage_upload_done";

export type CommentaryLatencyEvent = {
  clientEventId: string;
  stage: CommentaryLatencyStage;
  atMs: number;
  deliveryCommittedAtMs?: number;
  extra?: Record<string, number | string | boolean | null>;
};

export function isCommentaryLatencyLogEnabled(): boolean {
  return process.env.DELIVERY_COMMENTARY_LATENCY_LOG === "1";
}

export function logCommentaryLatency(event: CommentaryLatencyEvent): void {
  if (!isCommentaryLatencyLogEnabled()) return;
  const anchor = event.deliveryCommittedAtMs;
  const deltaMs =
    anchor != null ? event.atMs - anchor : undefined;
  console.info(
    "[commentary-latency]",
    JSON.stringify({
      ...event,
      deltaFromDeliveryMs: deltaMs,
    }),
  );
}
