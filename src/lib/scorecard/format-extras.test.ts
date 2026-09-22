import { describe, expect, it } from "vitest";
import { formatInningsExtrasSummary } from "@/lib/scorecard/format-extras";

describe("formatInningsExtrasSummary", () => {
  it("formats breakdown like professional scorecards", () => {
    expect(
      formatInningsExtrasSummary(8, {
        wides: 4,
        noBalls: 1,
        byes: 2,
        legByes: 1,
        penalty: 0,
      }),
    ).toBe("Extras 8 (b 2, lb 1, w 4, nb 1)");
  });
});
