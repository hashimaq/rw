import { describe, expect, it } from "vitest";
import { formatFallOfWicketsLine } from "@/lib/scorecard/format-fall-of-wickets";

describe("formatFallOfWicketsLine", () => {
  it("formats score-wicket order with comma separation", () => {
    expect(
      formatFallOfWicketsLine([
        {
          wicketNumber: 1,
          score: 16,
          batter: "Fakhar Zaman",
          over: "3.5",
        },
        {
          wicketNumber: 2,
          score: 46,
          batter: "Saud Shakeel",
          over: "8.3",
        },
      ]),
    ).toBe(
      "16-1 (Fakhar Zaman, 3.5), 46-2 (Saud Shakeel, 8.3)",
    );
  });
});
