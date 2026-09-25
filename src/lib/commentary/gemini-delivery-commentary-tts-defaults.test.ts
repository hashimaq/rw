import { describe, expect, it } from "vitest";
import { readFileSync } from "fs";
import { join } from "path";

describe("Gemini delivery TTS defaults", () => {
  it("prefers gemini-3.1 flash TTS as primary default", () => {
    const src = readFileSync(
      join(process.cwd(), "src/lib/commentary/gemini-delivery-commentary-tts.ts"),
      "utf8",
    );
    expect(src).toContain('DEFAULT_TTS_MODEL = "gemini-3.1-flash-tts-preview"');
    expect(src).toContain('FALLBACK_TTS_MODEL = "gemini-2.5-flash-preview-tts"');
  });
});
