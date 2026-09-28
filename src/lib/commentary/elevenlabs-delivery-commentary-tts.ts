import "server-only";

import { AiProviderError } from "@/lib/ai/gemini/errors";
import {
  readElevenLabsApiKey,
  readElevenLabsModel,
  readElevenLabsVoiceId,
} from "@/lib/commentary/elevenlabs-config";

export type ElevenLabsTtsHooks = {
  onFirstAudioByte?: (atMs: number) => void;
};

function classifyElevenLabsError(status: number, detail: string): AiProviderError {
  const lower = detail.toLowerCase();
  if (status === 429) {
    const quota =
      lower.includes("quota") ||
      lower.includes("insufficient") ||
      lower.includes("credit");
    return new AiProviderError(
      quota ? "ElevenLabs quota exceeded" : "ElevenLabs rate limited",
      quota ? "provider_error" : "rate_limited",
    );
  }
  return new AiProviderError(
    `ElevenLabs TTS HTTP ${status}${detail ? `: ${detail.slice(0, 200)}` : ""}`,
    "provider_error",
  );
}

async function readStreamToBuffer(
  body: ReadableStream<Uint8Array>,
  hooks?: ElevenLabsTtsHooks,
): Promise<Buffer> {
  const reader = body.getReader();
  const parts: Buffer[] = [];
  let firstByteLogged = false;
  try {
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      if (!value?.length) continue;
      if (!firstByteLogged) {
        firstByteLogged = true;
        hooks?.onFirstAudioByte?.(Date.now());
      }
      parts.push(Buffer.from(value));
    }
  } finally {
    reader.releaseLock();
  }
  if (parts.length === 0) {
    throw new AiProviderError("ElevenLabs returned no audio", "provider_error");
  }
  return Buffer.concat(parts);
}

export async function synthesizeElevenLabsDeliverySpeech(
  commentaryText: string,
  hooks?: ElevenLabsTtsHooks,
): Promise<{ buffer: Buffer; mimeType: string; model: string }> {
  const apiKey = readElevenLabsApiKey();
  const voiceId = readElevenLabsVoiceId();
  const model = readElevenLabsModel();

  const url = new URL(
    `https://api.elevenlabs.io/v1/text-to-speech/${encodeURIComponent(voiceId)}/stream`,
  );
  url.searchParams.set("optimize_streaming_latency", "4");
  url.searchParams.set("output_format", "mp3_44100_128");

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 45_000);

  let res: Response;
  try {
    res = await fetch(url.toString(), {
      method: "POST",
      headers: {
        "xi-api-key": apiKey,
        "Content-Type": "application/json",
        Accept: "audio/mpeg",
      },
      body: JSON.stringify({
        text: commentaryText,
        model_id: model,
        voice_settings: {
          stability: 0.45,
          similarity_boost: 0.75,
          style: 0.15,
          use_speaker_boost: true,
        },
      }),
      signal: controller.signal,
    });
  } catch (err) {
    clearTimeout(timer);
    if (err instanceof Error && err.name === "AbortError") {
      throw new AiProviderError("ElevenLabs TTS timed out", "timeout");
    }
    throw new AiProviderError("ElevenLabs TTS request failed", "provider_error");
  } finally {
    clearTimeout(timer);
  }

  if (!res.ok) {
    const detail = await res.text().catch(() => "");
    throw classifyElevenLabsError(res.status, detail);
  }

  if (!res.body) {
    throw new AiProviderError("ElevenLabs TTS empty body", "provider_error");
  }

  const buffer = await readStreamToBuffer(res.body, hooks);
  return { buffer, mimeType: "audio/mpeg", model: `elevenlabs:${model}` };
}
