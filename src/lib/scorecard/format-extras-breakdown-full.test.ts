import { describe, expect, it } from "vitest";
import { formatExtrasBreakdownFull } from "@/lib/scorecard/format-extras-breakdown-full";

describe("formatExtrasBreakdownFull", () => {
  it("matches template-style full breakdown including zeros", () => {
    expect(
      formatExtrasBreakdownFull({
        byes: 1,
        legByes: 0,
        wides: 12,
        noBalls: 3,
        penalty: 0,
      }),
    ).toBe("(b 1, lb 0, w 12, nb 3, p 0)");
  });
});
