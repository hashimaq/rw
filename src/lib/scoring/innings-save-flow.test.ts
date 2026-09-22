import { describe, expect, it } from "vitest";
import { shouldAutoCompleteMatchAfterInnings } from "@/lib/scoring/finalize-match";

describe("innings save / match flow", () => {
  it("first innings completion does not auto-complete the match", () => {
    expect(shouldAutoCompleteMatchAfterInnings(1)).toBe(false);
  });

  it("second innings completion triggers match finalization path", () => {
    expect(shouldAutoCompleteMatchAfterInnings(2)).toBe(true);
  });
});
