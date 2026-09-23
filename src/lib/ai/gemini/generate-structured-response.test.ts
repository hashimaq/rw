import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { z } from "zod";
import {
  generateGeminiStructuredResponse,
  verifyGeminiStructuredConnection,
} from "@/lib/ai/gemini/generate-structured-response";

const pingSchema = z.object({ ok: z.literal(true) });

describe("generateGeminiStructuredResponse", () => {
  const originalFetch = globalThis.fetch;
  const originalKey = process.env.GEMINI_API_KEY;

  beforeEach(() => {
    process.env.GEMINI_API_KEY = "test-gemini-key";
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
    if (originalKey === undefined) {
      delete process.env.GEMINI_API_KEY;
    } else {
      process.env.GEMINI_API_KEY = originalKey;
    }
    vi.restoreAllMocks();
  });

  it("throws when GEMINI_API_KEY is missing", async () => {
    delete process.env.GEMINI_API_KEY;
    await expect(
      generateGeminiStructuredResponse({
        systemInstruction: "test",
        userPayload: {},
        parse: pingSchema.parse,
      }),
    ).rejects.toMatchObject({
      code: "missing_api_key",
      message: "GEMINI_API_KEY is not configured",
    });
  });

  it("parses and validates structured JSON from Gemini", async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        candidates: [{ content: { parts: [{ text: '{"ok":true}' }] } }],
      }),
    }) as typeof fetch;

    const { data, model } = await generateGeminiStructuredResponse({
      systemInstruction: "test",
      userPayload: { ping: true },
      parse: pingSchema.parse,
    });

    expect(data.ok).toBe(true);
    expect(model).toBeTruthy();

    const [url, init] = vi.mocked(fetch).mock.calls[0]!;
    expect(String(url)).toContain("generativelanguage.googleapis.com");
    expect(init?.headers).toMatchObject({
      "X-goog-api-key": "test-gemini-key",
    });
    expect(String(url)).not.toContain("test-gemini-key");
  });

  it("rejects malformed JSON content", async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        candidates: [{ content: { parts: [{ text: "not-json" }] } }],
      }),
    }) as typeof fetch;

    await expect(
      generateGeminiStructuredResponse({
        systemInstruction: "test",
        userPayload: {},
        parse: pingSchema.parse,
      }),
    ).rejects.toMatchObject({ code: "malformed_response" });
  });

  it("rejects JSON that fails schema validation", async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        candidates: [{ content: { parts: [{ text: '{"ok":false}' }] } }],
      }),
    }) as typeof fetch;

    await expect(
      generateGeminiStructuredResponse({
        systemInstruction: "test",
        userPayload: {},
        parse: pingSchema.parse,
      }),
    ).rejects.toMatchObject({ code: "malformed_response" });
  });

  it("maps HTTP 401 to invalid_api_key", async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 401,
    }) as typeof fetch;

    await expect(
      generateGeminiStructuredResponse({
        systemInstruction: "test",
        userPayload: {},
        parse: pingSchema.parse,
      }),
    ).rejects.toMatchObject({ code: "invalid_api_key" });
  });

  it("verifyGeminiStructuredConnection uses the same pipeline", async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        candidates: [{ content: { parts: [{ text: '{"ok":true}' }] } }],
      }),
    }) as typeof fetch;

    const result = await verifyGeminiStructuredConnection();
    expect(result.ok).toBe(true);
  });
});
