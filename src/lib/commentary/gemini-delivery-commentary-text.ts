import "server-only";

import { AiProviderError } from "@/lib/ai/gemini/errors";
import { readGeminiApiKey } from "@/lib/ai/gemini/config";
import type { DeliveryCommentaryContext } from "@/lib/commentary/delivery-commentary-context";

const DEFAULT_COMMENTARY_MODEL = "gemini-3.5-flash-lite";

const SYSTEM_INSTRUCTION = `Pakistani cricket commentator. ONE very short Urdu sentence for this ball only.
Use Urdu script (not Roman Urdu). Keep striker and bowler names exactly as given (Latin if given in Latin).
State only what happened: runs, dot, extra type, wicket type if any. No invented details.
Max ~12 words of Urdu besides names. No markdown. No English except names. Output the sentence only.`;

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

  const userPayload = {
    over: context.overNumber,
    ball: context.ballNumber,
    striker: context.strikerName,
    bowler: context.bowlerName,
    batterRuns: context.batterRuns,
    extras: context.extrasRuns,
    extraType: context.extraType,
    totalRuns: context.totalRuns,
    legal: context.isLegalDelivery,
    boundary: context.isBoundary,
    six: context.isSix,
    wicket: context.isWicket,
    wicketType: context.wicketType,
    dismissed: context.dismissedPlayerName,
    score: `${context.teamTotalRuns}/${context.teamWickets}`,
    chase:
      context.target != null
        ? { need: context.runsNeeded, balls: context.ballsRemaining }
        : null,
  };

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
            parts: [{ text: JSON.stringify(userPayload) }],
          },
        ],
        generationConfig: {
          temperature: 0.7,
          maxOutputTokens: 64,
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
