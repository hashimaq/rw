import { describe, expect, it } from "vitest";
import {
  canShowFullMatchScorecardPage,
  isPublicScorecardVisibleToAnon,
} from "@/lib/scorecard/public-scorecard-access";

describe("public scorecard visibility", () => {
  it("allows anon only for completed public scorecards", () => {
    expect(
      isPublicScorecardVisibleToAnon({
        status: "completed",
        is_public_scorecard: true,
      }),
    ).toBe(true);
    expect(
      isPublicScorecardVisibleToAnon({
        status: "completed",
        is_public_scorecard: false,
      }),
    ).toBe(false);
    expect(
      isPublicScorecardVisibleToAnon({
        status: "live",
        is_public_scorecard: true,
      }),
    ).toBe(false);
  });

  it("allows admin to view private completed scorecards", () => {
    expect(
      canShowFullMatchScorecardPage(
        { status: "completed", is_public_scorecard: false },
        { isAdmin: true },
      ),
    ).toBe(true);
    expect(
      canShowFullMatchScorecardPage(
        { status: "completed", is_public_scorecard: false },
        { isAdmin: false },
      ),
    ).toBe(false);
  });

  it("allows public live scorecard when is_public_live", () => {
    expect(
      canShowFullMatchScorecardPage(
        {
          status: "live",
          is_public_scorecard: false,
          is_public_live: true,
        },
        { isAdmin: false },
      ),
    ).toBe(true);
  });

  it("blocks live scorecard when not public live", () => {
    expect(
      canShowFullMatchScorecardPage(
        {
          status: "live",
          is_public_scorecard: true,
          is_public_live: false,
        },
        { isAdmin: false },
      ),
    ).toBe(false);
  });
});
