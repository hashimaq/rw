import { describe, expect, it, vi, afterEach } from "vitest";
import { synthesizeDeliveryCommentarySpeech } from "@/lib/commentary/delivery-commentary-tts";

vi.mock("@/lib/commentary/elevenlabs-delivery-commentary-tts", () => ({
  synthesizeElevenLabsDeliverySpeech: vi.fn(),
}));

vi.mock("@/lib/commentary/gemini-delivery-commentary-tts", () => ({
  synthesizeDeliveryCommentarySpeech: vi.fn(),
  isGeminiTtsQuotaExceeded: vi.fn(),
}));

import { synthesizeElevenLabsDeliverySpeech } from "@/lib/commentary/elevenlabs-delivery-commentary-tts";
import { synthesizeDeliveryCommentarySpeech as synthesizeGeminiSpeech } from "@/lib/commentary/gemini-delivery-commentary-tts";

describe("synthesizeDeliveryCommentarySpeech router", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.clearAllMocks();
  });

  it("uses ElevenLabs when configured", async () => {
    vi.stubEnv("ELEVENLABS_API_KEY", "k");
    vi.stubEnv("DELIVERY_COMMENTARY_TTS_PROVIDER", "elevenlabs");
    vi.mocked(synthesizeElevenLabsDeliverySpeech).mockResolvedValue({
      buffer: Buffer.from("mp3"),
      mimeType: "audio/mpeg",
      model: "elevenlabs:eleven_flash_v2_5",
    });

    const out = await synthesizeDeliveryCommentarySpeech("چوکا");
    expect(out.mimeType).toBe("audio/mpeg");
    expect(synthesizeElevenLabsDeliverySpeech).toHaveBeenCalled();
    expect(synthesizeGeminiSpeech).not.toHaveBeenCalled();
  });

  it("falls back to Gemini when ElevenLabs fails", async () => {
    vi.stubEnv("ELEVENLABS_API_KEY", "k");
    vi.stubEnv("DELIVERY_COMMENTARY_TTS_PROVIDER", "elevenlabs");
    vi.mocked(synthesizeElevenLabsDeliverySpeech).mockRejectedValue(
      new Error("ElevenLabs down"),
    );
    vi.mocked(synthesizeGeminiSpeech).mockResolvedValue({
      buffer: Buffer.from("wav"),
      mimeType: "audio/wav",
      model: "gemini-tts",
    });

    const out = await synthesizeDeliveryCommentarySpeech("وائڈ");
    expect(out.mimeType).toBe("audio/wav");
    expect(synthesizeGeminiSpeech).toHaveBeenCalled();
  });
});
