import "server-only";

import { AiProviderError } from "@/lib/ai/gemini/errors";
import { readGeminiApiKey, readGeminiModel } from "@/lib/ai/gemini/config";

const DEFAULT_TIMEOUT_MS = 60_000;

export type GeminiStructuredResponseRequest<T> = {
  systemInstruction: string;
  userPayload: unknown;
  parse: (raw: unknown) => T;
  model?: string;
  timeoutMs?: number;
  responseJsonSchema?: Record<string, unknown>;
};

type GeminiGenerateContentResponse = {
  candidates?: Array<{
    content?: { parts?: Array<{ text?: string }> };
  }>;
  error?: { message?: string; code?: number; status?: string };
};

function mapHttpStatusToError(status: number): AiProviderError {
  if (status === 401 || status === 403) {
    return new AiProviderError("Gemini API key rejected", "invalid_api_key");
  }
  if (status === 429) {
    return new AiProviderError("Gemini rate limit exceeded", "rate_limited");
  }
  return new AiProviderError("Gemini request failed", "provider_error");
}

/**
 * Request JSON from Gemini and validate with the supplied parser (e.g. Zod).
 * API key is read from GEMINI_API_KEY only — never passed in from callers.
 */
export async function generateGeminiStructuredResponse<T>(
  request: GeminiStructuredResponseRequest<T>,
): Promise<{ data: T; model: string }> {
  const apiKey = readGeminiApiKey();
  const model = request.model ?? readGeminiModel();
  const timeoutMs = request.timeoutMs ?? DEFAULT_TIMEOUT_MS;

  const url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`;

  const generationConfig: Record<string, unknown> = {
    temperature: 0.2,
    responseMimeType: "application/json",
  };
  if (request.responseJsonSchema) {
    generationConfig.responseSchema = request.responseJsonSchema;
  }

  const body = {
    systemInstruction: {
      parts: [{ text: request.systemInstruction }],
    },
    contents: [
      {
        role: "user",
        parts: [{ text: JSON.stringify(request.userPayload) }],
      },
    ],
    generationConfig,
  };

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  let res: Response;
  try {
    res = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-goog-api-key": apiKey,
      },
      body: JSON.stringify(body),
      signal: controller.signal,
    });
  } catch (err) {
    if (err instanceof Error && err.name === "AbortError") {
      throw new AiProviderError("Gemini request timed out", "timeout");
    }
    throw new AiProviderError("Gemini network request failed", "network_failure");
  } finally {
    clearTimeout(timer);
  }

  if (!res.ok) {
    let detail = "";
    try {
      const errJson = (await res.json()) as GeminiGenerateContentResponse;
      detail = errJson.error?.message?.trim() ?? "";
    } catch {
      /* ignore parse failure */
    }
    const base = mapHttpStatusToError(res.status);
    if (detail) {
      throw new AiProviderError(
        `${base.message}: ${detail}`.slice(0, 400),
        base.code,
      );
    }
    throw base;
  }

  let json: GeminiGenerateContentResponse;
  try {
    json = (await res.json()) as GeminiGenerateContentResponse;
  } catch {
    throw new AiProviderError("Gemini returned invalid JSON envelope", "malformed_response");
  }

  if (json.error) {
    throw new AiProviderError("Gemini provider error", "provider_error");
  }

  const text = json.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!text?.trim()) {
    throw new AiProviderError("Gemini returned empty content", "malformed_response");
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    throw new AiProviderError("Gemini returned non-JSON content", "malformed_response");
  }

  try {
    return { data: request.parse(parsed), model };
  } catch {
    throw new AiProviderError(
      "Gemini JSON failed schema validation",
      "malformed_response",
    );
  }
}

/** Minimal connectivity check (mock fetch in unit tests; optional manual script). */
export async function verifyGeminiStructuredConnection(): Promise<{
  ok: true;
  model: string;
}> {
  const { model } = await generateGeminiStructuredResponse({
    systemInstruction: 'Reply with JSON: {"ok":true}',
    userPayload: { ping: true },
    parse: (raw) => {
      if (
        typeof raw === "object" &&
        raw !== null &&
        "ok" in raw &&
        (raw as { ok: unknown }).ok === true
      ) {
        return raw;
      }
      throw new Error("Unexpected ping response");
    },
    responseJsonSchema: {
      type: "object",
      properties: { ok: { type: "boolean" } },
      required: ["ok"],
    },
  });
  return { ok: true, model };
}
