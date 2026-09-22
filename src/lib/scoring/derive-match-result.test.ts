import { describe, expect, it } from "vitest";
import {
  deriveMatchResult,
  type InningsResultInput,
} from "@/lib/scoring/derive-match-result";
import { shouldAutoCompleteMatchAfterInnings } from "@/lib/scoring/finalize-match";

const OPP = "ABC Club";

function inn(
  inningsNumber: number,
  battingTeam: "red_wings" | "opponent",
  totalRuns: number,
  wickets: number,
  target: number | null = null,
): InningsResultInput {
  return {
    inningsNumber,
    battingTeam,
    totalRuns,
    wickets,
    target,
  };
}

describe("deriveMatchResult", () => {
  it("Red Wings batting first wins by runs (Test 1)", () => {
    const r = deriveMatchResult(
      [
        inn(1, "red_wings", 165, 8),
        inn(2, "opponent", 142, 10, 166),
      ],
      OPP,
    );
    expect(r?.winner).toBe("red_wings");
    expect(r?.winMargin).toBe(23);
    expect(r?.winMarginType).toBe("runs");
    expect(r?.result).toBe("red_wings_win");
    expect(r?.resultSummary).toBe("Red Wings won by 23 runs");
  });

  it("Opponent batting first wins by runs (Test 2)", () => {
    const r = deriveMatchResult(
      [
        inn(1, "opponent", 180, 6),
        inn(2, "red_wings", 150, 10, 181),
      ],
      OPP,
    );
    expect(r?.winner).toBe("opponent");
    expect(r?.winMargin).toBe(30);
    expect(r?.winMarginType).toBe("runs");
    expect(r?.result).toBe("opponent_win");
    expect(r?.resultSummary).toBe(`${OPP} won by 30 runs`);
  });

  it("Red Wings chasing wins by wickets (Test 3)", () => {
    const r = deriveMatchResult(
      [
        inn(1, "opponent", 160, 7),
        inn(2, "red_wings", 161, 4, 161),
      ],
      OPP,
    );
    expect(r?.winner).toBe("red_wings");
    expect(r?.winMargin).toBe(6);
    expect(r?.winMarginType).toBe("wickets");
    expect(r?.resultSummary).toContain("6 wicket");
  });

  it("Opponent chasing wins by wickets (Test 4)", () => {
    const r = deriveMatchResult(
      [
        inn(1, "red_wings", 165, 5),
        inn(2, "opponent", 166, 5, 166),
      ],
      OPP,
    );
    expect(r?.winner).toBe("opponent");
    expect(r?.winMargin).toBe(5);
    expect(r?.winMarginType).toBe("wickets");
  });

  it("tie when totals are level (Test 5)", () => {
    const r = deriveMatchResult(
      [
        inn(1, "red_wings", 165, 8),
        inn(2, "opponent", 165, 10, 166),
      ],
      OPP,
    );
    expect(r?.winner).toBeNull();
    expect(r?.winMargin).toBeNull();
    expect(r?.winMarginType).toBeNull();
    expect(r?.result).toBe("tie");
    expect(r?.resultSummary).toBe("Match tied");
  });

  it("uses innings batting teams, not setup role labels (Test 7)", () => {
    const rwBowlFirst = deriveMatchResult(
      [
        inn(1, "opponent", 120, 10),
        inn(2, "red_wings", 121, 2, 121),
      ],
      OPP,
    );
    expect(rwBowlFirst?.winner).toBe("red_wings");
    expect(rwBowlFirst?.winMarginType).toBe("wickets");

    const rwBatSecond = deriveMatchResult(
      [
        inn(1, "opponent", 200, 4),
        inn(2, "red_wings", 180, 10, 201),
      ],
      OPP,
    );
    expect(rwBatSecond?.winner).toBe("opponent");
    expect(rwBatSecond?.winMargin).toBe(20);
  });

  describe("Red Wings orientation combinations (Test 6)", () => {
    it("RW batting + 1st innings (first innings only — no result)", () => {
      expect(deriveMatchResult([inn(1, "red_wings", 50, 2)], OPP)).toBeNull();
    });

    it("RW batting + 2nd innings chase win", () => {
      const r = deriveMatchResult(
        [
          inn(1, "opponent", 100, 10),
          inn(2, "red_wings", 101, 3, 101),
        ],
        OPP,
      );
      expect(r?.winner).toBe("red_wings");
      expect(r?.winMarginType).toBe("wickets");
    });

    it("RW bowling + 1st innings (opponent bats first, no result yet)", () => {
      expect(
        deriveMatchResult([inn(1, "opponent", 80, 5)], OPP),
      ).toBeNull();
    });

    it("RW bowling + 2nd innings defend win by runs", () => {
      const r = deriveMatchResult(
        [
          inn(1, "opponent", 130, 10),
          inn(2, "red_wings", 110, 10, 131),
        ],
        OPP,
      );
      expect(r?.winner).toBe("opponent");
      expect(r?.winMarginType).toBe("runs");
    });
  });

  it("first innings completion does not auto-complete match (Test 8)", () => {
    expect(shouldAutoCompleteMatchAfterInnings(1)).toBe(false);
    expect(shouldAutoCompleteMatchAfterInnings(2)).toBe(true);
  });
});
