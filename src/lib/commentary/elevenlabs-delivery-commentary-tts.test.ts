import { describe, expect, it, vi, afterEach } from "vitest";
import { synthesizeElevenLabsDeliverySpeech } from "@/lib/commentary/elevenlabs-delivery-commentary-tts";

describe("synthesizeElevenLabsDeliverySpeech", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.restoreAllMocks();
  });

  it("streams mp3 and reports first audio byte", async () => {
    vi.stubEnv("ELEVENLABS_API_KEY", "test-key");
    vi.stubEnv("ELEVENLABS_VOICE_ID", "voice123");
    vi.stubEnv("ELEVENLABS_MODEL", "eleven_flash_v2_5");

    const chunk1 = new Uint8Array([1, 2, 3]);
    const chunk2 = new Uint8Array([4, 5]);
    const stream = new ReadableStream<Uint8Array>({
      start(controller) {
        controller.enqueue(chunk1);
        controller.enqueue(chunk2);
        controller.close();
      },
    });

    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        body: stream,
      }),
    );

    let firstAt: number | undefined;
    const result = await synthesizeElevenLabsDeliverySpeech("چار رن!", {
      onFirstAudioByte: (at) => {
        firstAt = at;
      },
    });

    expect(result.mimeType).toBe("audio/mpeg");
    expect(result.buffer.length).toBe(5);
    expect(result.model).toContain("eleven_flash_v2_5");
    expect(firstAt).toBeTypeOf("number");
    expect(fetch).toHaveBeenCalledWith(
      expect.stringContaining("/text-to-speech/voice123/stream"),
      expect.objectContaining({ method: "POST" }),
    );
  });

  it("classifies 429 rate limit", async () => {
    vi.stubEnv("ELEVENLABS_API_KEY", "test-key");
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: false,
        status: 429,
        text: async () => "Too many requests",
      }),
    );

    await expect(
      synthesizeElevenLabsDeliverySpeech("ٹیسٹ"),
    ).rejects.toMatchObject({ code: "rate_limited" });
  });
});
