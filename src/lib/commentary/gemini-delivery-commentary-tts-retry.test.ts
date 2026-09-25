import { describe, expect, it } from "vitest";
import { isGeminiTtsQuotaExceeded } from "@/lib/commentary/gemini-delivery-commentary-tts";

describe("Gemini TTS rate limit handling", () => {
  it("detects quota-exhausted 429 bodies", () => {
    expect(
      isGeminiTtsQuotaExceeded(
        '{"error":{"code":429,"message":"You exceeded your current quota"}}',
      ),
    ).toBe(true);
    expect(isGeminiTtsQuotaExceeded("RESOURCE_EXHAUSTED")).toBe(true);
  });

  it("does not treat generic 429 as quota", () => {
    expect(isGeminiTtsQuotaExceeded("Too many requests per minute")).toBe(false);
  });
});
