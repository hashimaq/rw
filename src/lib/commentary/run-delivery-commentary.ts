import "server-only";

import { isGeminiConfigured } from "@/lib/ai/gemini/config";
import { putCommentaryAudioInEphemeralCache } from "@/lib/commentary/commentary-audio-ephemeral-cache";
import { logCommentaryLatency } from "@/lib/commentary/commentary-latency-log";
import {
  buildDeliveryCommentaryContext,
  type DeliveryCommentaryContext,
} from "@/lib/commentary/delivery-commentary-context";
import { generateDeliveryCommentaryText } from "@/lib/commentary/gemini-delivery-commentary-text";
import { synthesizeDeliveryCommentarySpeech } from "@/lib/commentary/gemini-delivery-commentary-tts";
import type { Delivery } from "@/lib/database/types";
import { createServiceRoleClient } from "@/lib/supabase/admin";
import type { DeliveryInputPayload } from "@/lib/validation/delivery";

const STORAGE_BUCKET = "delivery-commentary";

function extensionForMime(mimeType: string): string {
  if (mimeType.includes("wav")) return "wav";
  if (mimeType.includes("ogg")) return "ogg";
  if (mimeType.includes("webm")) return "webm";
  return "mp3";
}

function latency(
  clientEventId: string,
  stage: Parameters<typeof logCommentaryLatency>[0]["stage"],
  deliveryCommittedAtMs: number | undefined,
  extra?: Record<string, number | string | boolean | null>,
): void {
  logCommentaryLatency({
    clientEventId,
    stage,
    atMs: Date.now(),
    deliveryCommittedAtMs,
    extra,
  });
}

async function markFailed(
  clientEventId: string,
  message: string,
): Promise<void> {
  console.error("[delivery-commentary] job failed:", clientEventId, message);
  const supabase = createServiceRoleClient();
  await supabase
    .from("delivery_commentary")
    .update({ status: "failed", error_message: message.slice(0, 500) })
    .eq("client_event_id", clientEventId);
}

function uploadCommentaryToStorage(
  path: string,
  buffer: Buffer,
  mimeType: string,
  clientEventId: string,
  deliveryCommittedAtMs: number | undefined,
): void {
  const supabase = createServiceRoleClient();
  latency(clientEventId, "storage_upload_started", deliveryCommittedAtMs);
  void supabase.storage
    .from(STORAGE_BUCKET)
    .upload(path, buffer, { contentType: mimeType, upsert: true })
    .then(({ error }) => {
      latency(clientEventId, "storage_upload_done", deliveryCommittedAtMs, {
        ok: !error,
        error: error?.message ?? null,
      });
      if (error) {
        console.error("[delivery-commentary] storage upload:", error.message);
      }
    });
}

export async function runDeliveryCommentaryJob(
  context: DeliveryCommentaryContext,
  deliveryCommittedAtMs?: number,
): Promise<void> {
  if (!isGeminiConfigured()) {
    await markFailed(context.clientEventId, "GEMINI_API_KEY not configured");
    return;
  }

  const supabase = createServiceRoleClient();

  const { data: claimed, error: claimError } = await supabase
    .from("delivery_commentary")
    .update({ status: "processing", error_message: null })
    .eq("client_event_id", context.clientEventId)
    .in("status", ["pending", "processing", "failed"])
    .select("client_event_id")
    .maybeSingle();

  if (claimError || !claimed) {
    return;
  }

  latency(context.clientEventId, "job_claimed", deliveryCommittedAtMs);

  try {
    latency(context.clientEventId, "gemini_text_started", deliveryCommittedAtMs);
    const textStarted = Date.now();
    const { text } = await generateDeliveryCommentaryText(context);
    latency(context.clientEventId, "gemini_text_done", deliveryCommittedAtMs, {
      durationMs: Date.now() - textStarted,
      textLength: text.length,
    });

    latency(context.clientEventId, "gemini_tts_started", deliveryCommittedAtMs);
    const ttsStarted = Date.now();
    const { buffer, mimeType, model: ttsModel } =
      await synthesizeDeliveryCommentarySpeech(text);
    latency(context.clientEventId, "gemini_tts_done", deliveryCommittedAtMs, {
      durationMs: Date.now() - ttsStarted,
      bytes: buffer.length,
      ttsModel,
    });

    latency(context.clientEventId, "wav_ready", deliveryCommittedAtMs);

    const path = `${context.matchId}/${context.clientEventId}.${extensionForMime(mimeType)}`;

    putCommentaryAudioInEphemeralCache(
      context.clientEventId,
      context.matchId,
      buffer,
      mimeType,
    );
    latency(context.clientEventId, "ephemeral_cache_set", deliveryCommittedAtMs);

    const { error: readyError } = await supabase
      .from("delivery_commentary")
      .update({
        status: "ready",
        commentary_text: text,
        audio_storage_path: path,
        error_message: null,
      })
      .eq("client_event_id", context.clientEventId);

    if (readyError) {
      throw new Error(readyError.message);
    }

    latency(context.clientEventId, "db_ready", deliveryCommittedAtMs);

    uploadCommentaryToStorage(
      path,
      buffer,
      mimeType,
      context.clientEventId,
      deliveryCommittedAtMs,
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : "Commentary failed";
    await markFailed(context.clientEventId, message);
  }
}

export async function scheduleDeliveryCommentaryForDelivery(options: {
  matchId: string;
  payload: DeliveryInputPayload;
  existingRows: Delivery[];
  oversLimit: number;
  target: number | null;
  deliveryCommittedAtMs?: number;
}): Promise<void> {
  if (!isGeminiConfigured()) return;

  const deliveryCommittedAtMs = options.deliveryCommittedAtMs;
  const clientEventId = options.payload.client_event_id;

  if (deliveryCommittedAtMs != null) {
    logCommentaryLatency({
      clientEventId,
      stage: "delivery_committed",
      atMs: deliveryCommittedAtMs,
      deliveryCommittedAtMs,
    });
  }
  latency(clientEventId, "job_scheduled", deliveryCommittedAtMs);

  const context = buildDeliveryCommentaryContext(
    options.matchId,
    options.payload,
    options.existingRows,
    options.oversLimit,
    options.target,
  );

  const supabase = createServiceRoleClient();
  const { data: inserted, error } = await supabase
    .from("delivery_commentary")
    .insert({
      client_event_id: context.clientEventId,
      match_id: context.matchId,
      innings_id: context.inningsId,
      sequence_in_innings: context.sequenceInInnings,
      status: "processing",
    })
    .select("client_event_id")
    .maybeSingle();

  if (error) {
    if (error.code === "23505") return;
    console.error("[delivery-commentary] insert:", error.message);
    return;
  }

  if (!inserted) return;

  latency(clientEventId, "db_row_inserted", deliveryCommittedAtMs);

  await runDeliveryCommentaryJob(context, deliveryCommittedAtMs);
}
