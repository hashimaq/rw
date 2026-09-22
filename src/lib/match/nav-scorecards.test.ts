import { describe, expect, it } from "vitest";
import { secondaryNav } from "@/components/layout/nav-config";
import { getMatchCentreHubActions } from "@/lib/match/match-centre-actions";

describe("Scorecards navigation", () => {
  it("Scorecards appears in main secondary navigation", () => {
    expect(secondaryNav.some((item) => item.href === "/scorecards")).toBe(
      true,
    );
  });

  it("Match Centre scorecard link still targets /match/[slug]", () => {
    const actions = getMatchCentreHubActions("live", "xyz");
    expect(actions.find((a) => a.label === "Scorecard")?.href).toBe(
      "/match/xyz",
    );
  });
});
