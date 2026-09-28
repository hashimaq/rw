import "server-only";

import { AiProviderError } from "@/lib/ai/gemini/errors";
import {
  readDeliveryCommentaryTtsProvider,
} from "@/lib/commentary/elevenlabs-config";
import { synthesizeElevenLabsDeliverySpeech } from "@/lib/commentary/elevenlabs-delivery-commentary-tts";
import {
  isGeminiTtsQuotaExceeded,
  synthesizeDeliveryCommentarySpeech as synthesizeGeminiSpeech,
} from "@/lib/commentary/gemini-delivery-commentary-tts";

export { isGeminiTtsQuotaExceeded } from "@/lib/commentary/gemini-delivery-commentary-tts";

export type DeliveryCommentaryTtsHooks = {
  onFirstAudioByte?: (atMs: number) => void;
  onProvider?: (provider: "elevenlabs" | "gemini") => void;
};

function sleepMs(ms: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

async function withRateLimitRetries<T>(
  label: string,
  fn: () => Promise<T>,
): Promise<T> {
  let lastErr: unknown;
  for (let attempt = 0; attempt < 4; attempt += 1) {
    try {
      return await fn();
    } catch (err) {
      lastErr = err;
      const rateLimited =
        err instanceof AiProviderError && err.code === "rate_limited";
      if (!rateLimited || attempt >= 3) throw err;
      const delayMs = 400 * 2 ** attempt;
      console.warn(
        `[delivery-commentary] TTS rate limited (${label}), retry ${attempt + 1}/3 in ${delayMs}ms`,
      );
      await sleepMs(delayMs);
    }
  }
  throw lastErr;
}

export async function synthesizeDeliveryCommentarySpeech(
  commentaryText: string,
  hooks?: DeliveryCommentaryTtsHooks,
): Promise<{ buffer: Buffer; mimeType: string; model: string }> {
  const provider = readDeliveryCommentaryTtsProvider();
  hooks?.onProvider?.(provider);

  if (provider === "elevenlabs") {
    try {
      return await withRateLimitRetries("elevenlabs", () =>
        synthesizeElevenLabsDeliverySpeech(commentaryText, {
          onFirstAudioByte: hooks?.onFirstAudioByte,
        }),
      );
    } catch (elevenErr) {
      console.warn(
        "[delivery-commentary] ElevenLabs TTS failed, falling back to Gemini:",
        elevenErr instanceof Error ? elevenErr.message : elevenErr,
      );
      hooks?.onProvider?.("gemini");
      return synthesizeGeminiSpeech(commentaryText);
    }
  }

  return synthesizeGeminiSpeech(commentaryText);
}
