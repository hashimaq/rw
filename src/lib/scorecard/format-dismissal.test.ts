import { describe, expect, it } from "vitest";
import {
  formatBattingDismissal,
  formatDismissalLabel,
} from "@/lib/scorecard/format-dismissal";

describe("formatBattingDismissal", () => {
  it("formats bowled with bowler", () => {
    expect(
      formatBattingDismissal({
        wicketType: "bowled",
        bowlerName: "Mujahid",
      }),
    ).toBe("b Mujahid");
  });

  it("formats caught with fielder and bowler", () => {
    expect(
      formatBattingDismissal({
        wicketType: "caught",
        fielderName: "Ali",
        bowlerName: "Omar",
      }),
    ).toBe("c Ali b Omar");
  });

  it("formats lbw", () => {
    expect(
      formatBattingDismissal({
        wicketType: "lbw",
        bowlerName: "Bowler",
      }),
    ).toBe("lbw b Bowler");
  });

  it("formats run out", () => {
    expect(
      formatBattingDismissal({
        wicketType: "run_out",
        fielderName: "Keeper",
      }),
    ).toBe("run out (Keeper)");
  });

  it("formats stumped", () => {
    expect(
      formatBattingDismissal({
        wicketType: "stumped",
        fielderName: "WK",
        bowlerName: "Spin",
      }),
    ).toBe("st WK b Spin");
  });
});

describe("formatDismissalLabel", () => {
  it("passes through already formatted labels", () => {
    expect(formatDismissalLabel("c Ali b Omar")).toBe("c Ali b Omar");
  });

  it("formats raw wicket type strings", () => {
    expect(formatDismissalLabel("bowled")).toBe("bowled");
  });
});
