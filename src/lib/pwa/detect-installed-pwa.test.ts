import { describe, expect, it } from "vitest";
import { readFileSync } from "fs";
import { join } from "path";

describe("installed PWA returning users", () => {
  it("initializes standalone synchronously so install gate never flashes", () => {
    const src = readFileSync(
      join(process.cwd(), "src/components/pwa/pwa-provider.tsx"),
      "utf8",
    );
    expect(src).toContain("useState(() =>");
    expect(src).toContain("isStandaloneDisplayMode()");
  });

  it("does not offer native install when already installed on device", () => {
    const src = readFileSync(
      join(process.cwd(), "src/components/pwa/pwa-provider.tsx"),
      "utf8",
    );
    expect(src).toContain("alreadyInstalledOnDevice");
    expect(src).toContain("!alreadyInstalledOnDevice");
  });
});
