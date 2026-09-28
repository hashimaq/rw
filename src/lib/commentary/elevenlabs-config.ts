import "server-only";

const DEFAULT_MODEL = "eleven_flash_v2_5";
/** Deep male voice — verified with Urdu sample + eleven_flash_v2_5 on this project. */
const DEFAULT_VOICE_ID = "pNInz6obpgDQGcFmaJgB";

export function isElevenLabsConfigured(): boolean {
  return Boolean(process.env.ELEVENLABS_API_KEY?.trim());
}

export function readElevenLabsApiKey(): string {
  const key = process.env.ELEVENLABS_API_KEY?.trim();
  if (!key) {
    throw new Error("ELEVENLABS_API_KEY not configured");
  }
  return key;
}

export function readElevenLabsModel(): string {
  return process.env.ELEVENLABS_MODEL?.trim() || DEFAULT_MODEL;
}

export function readElevenLabsVoiceId(): string {
  return process.env.ELEVENLABS_VOICE_ID?.trim() || DEFAULT_VOICE_ID;
}

export function readDeliveryCommentaryTtsProvider(): "elevenlabs" | "gemini" {
  const raw = process.env.DELIVERY_COMMENTARY_TTS_PROVIDER?.trim().toLowerCase();
  if (raw === "gemini") return "gemini";
  if (raw === "elevenlabs" && isElevenLabsConfigured()) return "elevenlabs";
  if (isElevenLabsConfigured()) return "elevenlabs";
  return "gemini";
}
