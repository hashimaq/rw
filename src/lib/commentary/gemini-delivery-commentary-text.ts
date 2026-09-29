import "server-only";

import { AiProviderError } from "@/lib/ai/gemini/errors";
import { readGeminiApiKey } from "@/lib/ai/gemini/config";
import type { DeliveryCommentaryContext } from "@/lib/commentary/delivery-commentary-context";

const DEFAULT_COMMENTARY_MODEL = "gemini-3.5-flash-lite";

const SYSTEM_INSTRUCTION = `Urdu cricket ball comment. One short sentence only. Urdu script. Keep player names as given. No markdown.`;

function readCommentaryModel(): string {
  return (
    process.env.GEMINI_DELIVERY_COMMENTARY_MODEL?.trim() ||
    DEFAULT_COMMENTARY_MODEL
  );
}

type GeminiGenerateContentResponse = {
  candidates?: Array<{
    content?: { parts?: Array<{ text?: string }> };
  }>;
  error?: { message?: string };
};

export async function generateDeliveryCommentaryText(
  context: DeliveryCommentaryContext,
): Promise<{ text: string; model: string }> {
  const apiKey = readGeminiApiKey();
  const model = readCommentaryModel();
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`;

  const bits: string[] = [
    `${context.overNumber}.${context.ballNumber}`,
    context.strikerName,
    context.bowlerName,
    `tr:${context.totalRuns}`,
  ];
  if (context.extrasRuns > 0) bits.push(`x:${context.extraType}+${context.extrasRuns}`);
  if (context.isSix) bits.push("six");
  else if (context.isBoundary) bits.push("four");
  if (context.isWicket) {
    bits.push(`w:${context.wicketType ?? "out"}`);
    if (context.dismissedPlayerName) bits.push(context.dismissedPlayerName);
  }
  if (!context.isLegalDelivery) bits.push("illegal");
  const userPayload = bits.join("|");

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 25_000);

  let res: Response;
  try {
    res = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-goog-api-key": apiKey,
      },
      body: JSON.stringify({
        systemInstruction: {
          parts: [{ text: SYSTEM_INSTRUCTION }],
        },
        contents: [
          {
            role: "user",
            parts: [{ text: userPayload }],
          },
        ],
        generationConfig: {
          temperature: 0.5,
          maxOutputTokens: 48,
        },
      }),
      signal: controller.signal,
    });
  } catch (err) {
    clearTimeout(timer);
    if (err instanceof Error && err.name === "AbortError") {
      throw new AiProviderError("Gemini commentary timed out", "timeout");
    }
    throw new AiProviderError("Gemini commentary request failed", "provider_error");
  } finally {
    clearTimeout(timer);
  }

  if (!res.ok) {
    throw new AiProviderError(
      `Gemini commentary HTTP ${res.status}`,
      res.status === 429 ? "rate_limited" : "provider_error",
    );
  }

  const json = (await res.json()) as GeminiGenerateContentResponse;
  const text = json.candidates?.[0]?.content?.parts?.[0]?.text?.trim();
  if (!text) {
    throw new AiProviderError("Gemini returned empty commentary", "provider_error");
  }
  return { text, model };
}
