import { describe, expect, it } from "vitest";
import { shouldAutoCompleteMatchAfterInnings } from "@/lib/scoring/finalize-match";

describe("automatic match completion", () => {
  it("does not auto-complete after innings 1", () => {
    expect(shouldAutoCompleteMatchAfterInnings(1)).toBe(false);
  });

  it("auto-completes after innings 2", () => {
    expect(shouldAutoCompleteMatchAfterInnings(2)).toBe(true);
  });
});
