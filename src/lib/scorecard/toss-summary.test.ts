import { describe, expect, it } from "vitest";
import { formatMatchTossSummary } from "@/lib/scorecard/toss-summary";

describe("formatMatchTossSummary", () => {
  it("returns null when toss data missing", () => {
    expect(formatMatchTossSummary({ toss_winner: null, toss_decision: null })).toBeNull();
  });

  it("formats Red Wings bat", () => {
    expect(
      formatMatchTossSummary({ toss_winner: "red_wings", toss_decision: "bat" }),
    ).toContain("Red Wings");
  });
});
