import { describe, expect, it } from "vitest";
import { getMatchCentreHubActions } from "@/lib/match/match-centre-actions";

describe("getMatchCentreHubActions", () => {
  const slug = "abc123";

  it("exposes View Live and Scorecard for live matches", () => {
    const actions = getMatchCentreHubActions("live", slug);
    expect(actions.map((a) => a.label)).toEqual([
      "View Live",
      "Scorecard",
      "Enter as Scorer",
    ]);
    expect(actions.find((a) => a.label === "Scorecard")?.href).toBe(
      `/match/${slug}`,
    );
  });

  it("prioritises View Scorecard when completed", () => {
    const actions = getMatchCentreHubActions("completed", slug);
    expect(actions[0]?.label).toBe("View Scorecard");
    expect(actions[0]?.variant).toBe("primary");
  });
});
