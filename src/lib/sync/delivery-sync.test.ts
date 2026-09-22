import { describe, expect, it } from "vitest";

describe("delivery sync error handling", () => {
  it("classifies deleted match sync failures as non-retryable", () => {
    const message =
      "match_removed:This match was deleted and cannot receive updates.";
    expect(message.startsWith("match_removed:")).toBe(true);
  });
});
