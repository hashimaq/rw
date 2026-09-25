import "server-only";

import { AiProviderError } from "@/lib/ai/gemini/errors";
import { readGeminiApiKey } from "@/lib/ai/gemini/config";

const DEFAULT_TTS_MODEL = "gemini-3.1-flash-tts-preview";
const FALLBACK_TTS_MODEL = "gemini-2.5-flash-preview-tts";
const DEFAULT_VOICE = "Puck";

function readPrimaryTtsModel(): string {
  return (
    process.env.GEMINI_DELIVERY_COMMENTARY_TTS_MODEL?.trim() ||
    DEFAULT_TTS_MODEL
  );
}

function readFallbackTtsModel(): string {
  return (
    process.env.GEMINI_DELIVERY_COMMENTARY_TTS_MODEL_FALLBACK?.trim() ||
    FALLBACK_TTS_MODEL
  );
}

function readVoiceName(): string {
  return (
    process.env.GEMINI_DELIVERY_COMMENTARY_VOICE?.trim() || DEFAULT_VOICE
  );
}

type GeminiTtsResponse = {
  candidates?: Array<{
    content?: {
      parts?: Array<{
        inlineData?: { mimeType?: string; data?: string };
      }>;
    };
  }>;
  error?: { message?: string };
};

type GeminiStreamChunk = GeminiTtsResponse;

function supportsStreamingTts(model: string): boolean {
  return /gemini-3\.1.*tts/i.test(model);
}

function buildTtsRequestBody(commentaryText: string): Record<string, unknown> {
  return {
    contents: [
      {
        role: "user",
        parts: [{ text: commentaryText }],
      },
    ],
    generationConfig: {
      responseModalities: ["AUDIO"],
      speechConfig: {
        voiceConfig: {
          prebuiltVoiceConfig: {
            voiceName: readVoiceName(),
          },
        },
      },
    },
  };
}

async function synthesizeWithGenerateContent(
  commentaryText: string,
  model: string,
): Promise<{ buffer: Buffer; mimeType: string; model: string }> {
  const apiKey = readGeminiApiKey();
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 45_000);

  let res: Response;
  try {
    res = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-goog-api-key": apiKey,
      },
      body: JSON.stringify(buildTtsRequestBody(commentaryText)),
      signal: controller.signal,
    });
  } catch (err) {
    clearTimeout(timer);
    if (err instanceof Error && err.name === "AbortError") {
      throw new AiProviderError("Gemini TTS timed out", "timeout");
    }
    throw new AiProviderError("Gemini TTS request failed", "provider_error");
  } finally {
    clearTimeout(timer);
  }

  if (!res.ok) {
    const detail = await res.text().catch(() => "");
    throw classifyTtsHttpError(res.status, detail);
  }

  const json = (await res.json()) as GeminiTtsResponse;
  return decodeTtsInline(json, model);
}

async function synthesizeWithStream(
  commentaryText: string,
  model: string,
): Promise<{ buffer: Buffer; mimeType: string; model: string }> {
  const apiKey = readGeminiApiKey();
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:streamGenerateContent?alt=sse`;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 45_000);

  let res: Response;
  try {
    res = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-goog-api-key": apiKey,
      },
      body: JSON.stringify(buildTtsRequestBody(commentaryText)),
      signal: controller.signal,
    });
  } catch (err) {
    clearTimeout(timer);
    if (err instanceof Error && err.name === "AbortError") {
      throw new AiProviderError("Gemini TTS timed out", "timeout");
    }
    throw new AiProviderError("Gemini TTS stream failed", "provider_error");
  } finally {
    clearTimeout(timer);
  }

  if (!res.ok) {
    const detail = await res.text().catch(() => "");
    throw classifyTtsHttpError(res.status, detail);
  }

  const body = await res.text();
  const pcmParts: Buffer[] = [];
  let mimeType = "audio/L16;codec=pcm;rate=24000";

  for (const line of body.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed.startsWith("data:")) continue;
    const payload = trimmed.slice(5).trim();
    if (!payload || payload === "[DONE]") continue;
    let chunk: GeminiStreamChunk;
    try {
      chunk = JSON.parse(payload) as GeminiStreamChunk;
    } catch {
      continue;
    }
    const inline = chunk.candidates?.[0]?.content?.parts?.find(
      (p) => p.inlineData?.data,
    )?.inlineData;
    if (!inline?.data) continue;
    if (inline.mimeType) mimeType = inline.mimeType;
    pcmParts.push(Buffer.from(inline.data, "base64"));
  }

  if (pcmParts.length === 0) {
    throw new AiProviderError("Gemini TTS stream returned no audio", "provider_error");
  }

  const buffer = Buffer.concat(pcmParts);
  return finalizeAudioBuffer(buffer, mimeType, model);
}

function decodeTtsInline(
  json: GeminiTtsResponse,
  model: string,
): { buffer: Buffer; mimeType: string; model: string } {
  const inline = json.candidates?.[0]?.content?.parts?.find(
    (p) => p.inlineData?.data,
  )?.inlineData;

  if (!inline?.data) {
    throw new AiProviderError("Gemini TTS returned no audio", "provider_error");
  }

  const mimeType = inline.mimeType?.trim() || "audio/mpeg";
  const buffer = Buffer.from(inline.data, "base64");
  return finalizeAudioBuffer(buffer, mimeType, model);
}

function finalizeAudioBuffer(
  buffer: Buffer,
  mimeType: string,
  model: string,
): { buffer: Buffer; mimeType: string; model: string } {
  if (/pcm|L16/i.test(mimeType)) {
    const rateMatch = /rate=(\d+)/i.exec(mimeType);
    const sampleRate = rateMatch ? Number(rateMatch[1]) : 24_000;
    return {
      buffer: pcm16LeToWav(buffer, sampleRate),
      mimeType: "audio/wav",
      model,
    };
  }
  return { buffer, mimeType, model };
}

function sleepMs(ms: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

/** Daily/quota 429s should not be retried — they hammer the API and never succeed. */
export function isGeminiTtsQuotaExceeded(detail: string): boolean {
  const lower = detail.toLowerCase();
  return (
    lower.includes("quota") ||
    lower.includes("resource_exhausted") ||
    lower.includes("exceeded your current quota")
  );
}

function classifyTtsHttpError(status: number, detail: string): AiProviderError {
  if (status === 429) {
    const quota = isGeminiTtsQuotaExceeded(detail);
    return new AiProviderError(
      quota
        ? "Gemini TTS quota exceeded (check AI Studio billing and TTS model limits)"
        : `Gemini TTS HTTP 429${detail ? `: ${detail.slice(0, 200)}` : ""}`,
      quota ? "provider_error" : "rate_limited",
    );
  }
  return new AiProviderError(
    `Gemini TTS HTTP ${status}${detail ? `: ${detail.slice(0, 200)}` : ""}`,
    "provider_error",
  );
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
): Promise<{ buffer: Buffer; mimeType: string; model: string }> {
  const primary = readPrimaryTtsModel();
  const fallback = readFallbackTtsModel();

  try {
    return await withRateLimitRetries(`primary:${primary}`, async () => {
      if (supportsStreamingTts(primary)) {
        return await synthesizeWithStream(commentaryText, primary);
      }
      return await synthesizeWithGenerateContent(commentaryText, primary);
    });
  } catch (primaryErr) {
    if (fallback === primary) throw primaryErr;
    const quotaPrimary =
      primaryErr instanceof AiProviderError &&
      primaryErr.message.toLowerCase().includes("quota exceeded");
    if (quotaPrimary) throw primaryErr;
    return withRateLimitRetries(`fallback:${fallback}`, async () => {
      if (supportsStreamingTts(fallback)) {
        return await synthesizeWithStream(commentaryText, fallback);
      }
      return await synthesizeWithGenerateContent(commentaryText, fallback);
    });
  }
}

function pcm16LeToWav(pcm: Buffer, sampleRate: number): Buffer {
  const numChannels = 1;
  const bitsPerSample = 16;
  const blockAlign = numChannels * (bitsPerSample / 8);
  const byteRate = sampleRate * blockAlign;
  const header = Buffer.alloc(44);
  header.write("RIFF", 0);
  header.writeUInt32LE(36 + pcm.length, 4);
  header.write("WAVE", 8);
  header.write("fmt ", 12);
  header.writeUInt32LE(16, 16);
  header.writeUInt16LE(1, 20);
  header.writeUInt16LE(numChannels, 22);
  header.writeUInt32LE(sampleRate, 24);
  header.writeUInt32LE(byteRate, 28);
  header.writeUInt16LE(blockAlign, 32);
  header.writeUInt16LE(bitsPerSample, 34);
  header.write("data", 36);
  header.writeUInt32LE(pcm.length, 40);
  return Buffer.concat([header, pcm]);
}
