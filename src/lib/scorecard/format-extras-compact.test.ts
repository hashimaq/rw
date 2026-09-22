import { describe, expect, it } from "vitest";
import { formatExtrasCompactLines } from "@/lib/scorecard/format-extras-compact";

describe("formatExtrasCompactLines", () => {
  it("formats non-zero extras as short lines", () => {
    expect(
      formatExtrasCompactLines({
        wides: 1,
        noBalls: 0,
        byes: 0,
        legByes: 0,
        penalty: 0,
      }),
    ).toEqual(["WD 1"]);
  });
});
