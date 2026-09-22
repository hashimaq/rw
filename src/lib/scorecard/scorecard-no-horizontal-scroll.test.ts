import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const SCORECARD_DIR = join(process.cwd(), "src/components/scorecard");

function scorecardSourceFiles(): string[] {
  return readdirSync(SCORECARD_DIR)
    .filter((f) => f.endsWith(".tsx"))
    .map((f) => join(SCORECARD_DIR, f));
}

describe("scorecard layout contract", () => {
  it("does not use horizontal scroll containers in scorecard components", () => {
    const forbidden = ["overflow-x-auto", "overflow-x-scroll", "overscroll-x"];
    for (const file of scorecardSourceFiles()) {
      const src = readFileSync(file, "utf8");
      for (const token of forbidden) {
        expect(src, `${file} must not contain ${token}`).not.toContain(token);
      }
    }
  });
});
