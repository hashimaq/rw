import { describe, expect, it } from "vitest";
import {
  deriveMatchResult,
  type InningsResultInput,
} from "@/lib/scoring/derive-match-result";
import { shouldAutoCompleteMatchAfterInnings } from "@/lib/scoring/finalize-match";

const OPP = "Khora";

function inn(
  inningsNumber: number,
  battingTeam: "red_wings" | "opponent",
  totalRuns: number,
  wickets: number,
  options?: { target?: number | null; complete?: boolean },
): InningsResultInput {
  return {
    inningsNumber,
    battingTeam,
    totalRuns,
    wickets,
    target: options?.target ?? null,
    inningsComplete: options?.complete,
    inningsStatus: options?.complete ? "completed" : "in_progress",
  };
}

describe("deriveMatchResult", () => {
  it("Red Wings batting first wins by runs (Test 1)", () => {
    const r = deriveMatchResult(
      [
        inn(1, "red_wings", 165, 8, { complete: true }),
        inn(2, "opponent", 142, 10, { target: 166, complete: true }),
      ],
      OPP,
    );
    expect(r?.winner).toBe("red_wings");
    expect(r?.winMargin).toBe(23);
    expect(r?.winMarginType).toBe("runs");
    expect(r?.resultSummary).toBe("Red Wings won by 23 runs");
  });

  it("target reached — Red Wings won by 10 wickets (22/0, target 22)", () => {
    const r = deriveMatchResult(
      [
        inn(1, "opponent", 21, 0, { complete: true }),
        inn(2, "red_wings", 22, 0, { target: 22, complete: true }),
      ],
      OPP,
    );
    expect(r?.winner).toBe("red_wings");
    expect(r?.winMargin).toBe(10);
    expect(r?.winMarginType).toBe("wickets");
    expect(r?.resultSummary).toBe("Red Wings won by 10 wickets");
  });

  it("target exceeded — Red Wings won by 9 wickets (23/1), NOT tie", () => {
    const r = deriveMatchResult(
      [
        inn(1, "opponent", 21, 0, { complete: true }),
        inn(2, "red_wings", 23, 1, { target: 22, complete: true }),
      ],
      OPP,
    );
    expect(r?.result).not.toBe("tie");
    expect(r?.winner).toBe("red_wings");
    expect(r?.winMargin).toBe(9);
    expect(r?.resultSummary).toBe("Red Wings won by 9 wickets");
  });

  it("does not call tie while chase level but innings incomplete (21/0)", () => {
    const r = deriveMatchResult(
      [
        inn(1, "opponent", 21, 0, { complete: true }),
        inn(2, "red_wings", 21, 0, { target: 22, complete: false }),
      ],
      OPP,
    );
    expect(r).toBeNull();
  });

  it("exact tie when second innings completes level (21/10)", () => {
    const r = deriveMatchResult(
      [
        inn(1, "opponent", 21, 0, { complete: true }),
        inn(2, "red_wings", 21, 10, { target: 22, complete: true }),
      ],
      OPP,
    );
    expect(r?.result).toBe("tie");
    expect(r?.resultSummary).toBe("Match tied");
  });

  it("defending win by runs when chase fails", () => {
    const r = deriveMatchResult(
      [
        inn(1, "red_wings", 100, 5, { complete: true }),
        inn(2, "opponent", 90, 10, { target: 101, complete: true }),
      ],
      OPP,
    );
    expect(r?.winner).toBe("red_wings");
    expect(r?.winMargin).toBe(10);
    expect(r?.winMarginType).toBe("runs");
  });

  it("Opponent batting first wins by runs", () => {
    const r = deriveMatchResult(
      [
        inn(1, "opponent", 180, 6, { complete: true }),
        inn(2, "red_wings", 150, 10, { target: 181, complete: true }),
      ],
      OPP,
    );
    expect(r?.winner).toBe("opponent");
    expect(r?.winMargin).toBe(30);
  });

  it("first innings completion does not auto-complete match", () => {
    expect(shouldAutoCompleteMatchAfterInnings(1)).toBe(false);
    expect(shouldAutoCompleteMatchAfterInnings(2)).toBe(true);
  });
});
