import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

describe("default light theme", () => {
  it("ThemeProvider defaults to light (not system)", () => {
    const src = readFileSync(
      join(process.cwd(), "src/components/theme/theme-provider.tsx"),
      "utf8",
    );
    expect(src).toMatch(/useState<Theme>\("light"\)/);
  });

  it("includes blocking theme init script for first paint", () => {
    const src = readFileSync(
      join(process.cwd(), "src/components/theme/theme-init-script.tsx"),
      "utf8",
    );
    expect(src).toContain("colorScheme");
    expect(src).toContain("rw-theme");
  });
});
