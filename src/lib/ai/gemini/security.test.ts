import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

describe("Gemini env security", () => {
  it("documents server-only GEMINI_API_KEY in .env.example", () => {
    const example = readFileSync(
      resolve(process.cwd(), ".env.example"),
      "utf8",
    );
    expect(example).toContain("GEMINI_API_KEY=");
    expect(example).not.toContain("NEXT_PUBLIC_GEMINI");
  });

  it("does not reference NEXT_PUBLIC_GEMINI in source", () => {
    const config = readFileSync(
      resolve(process.cwd(), "src/lib/ai/gemini/config.ts"),
      "utf8",
    );
    expect(config).toContain('process.env.GEMINI_API_KEY');
    expect(config).not.toContain("NEXT_PUBLIC");
  });
});
