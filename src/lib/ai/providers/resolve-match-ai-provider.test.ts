import { afterEach, describe, expect, it } from "vitest";
import { resolveMatchAiProviderId } from "@/lib/ai/providers/resolve-match-ai-provider";

describe("resolveMatchAiProviderId", () => {
  const original = process.env.MATCH_AI_PROVIDER;

  afterEach(() => {
    if (original === undefined) {
      delete process.env.MATCH_AI_PROVIDER;
    } else {
      process.env.MATCH_AI_PROVIDER = original;
    }
  });

  it("defaults to gemini", () => {
    delete process.env.MATCH_AI_PROVIDER;
    expect(resolveMatchAiProviderId()).toBe("gemini");
  });

  it("respects MATCH_AI_PROVIDER=openai", () => {
    process.env.MATCH_AI_PROVIDER = "openai";
    expect(resolveMatchAiProviderId()).toBe("openai");
  });
});
