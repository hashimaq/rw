import { describe, expect, it } from "vitest";
import { readFileSync } from "fs";
import { join } from "path";

const root = join(process.cwd(), "src");

describe("PWA native install flow", () => {
  it("captures beforeinstallprompt and calls prompt() then userChoice", () => {
    const src = readFileSync(
      join(root, "components/pwa/pwa-provider.tsx"),
      "utf8",
    );
    expect(src).toContain('addEventListener("beforeinstallprompt"');
    expect(src).toContain("e.preventDefault()");
    expect(src).toContain("await promptEvent.prompt()");
    expect(src).toContain("await promptEvent.userChoice");
  });

  it("unlocks on appinstalled and standalone display-mode only", () => {
    const src = readFileSync(
      join(root, "components/pwa/pwa-provider.tsx"),
      "utf8",
    );
    expect(src).toContain('addEventListener("appinstalled"');
    expect(src).toContain("isStandaloneDisplayMode()");
    expect(src).not.toContain("X-Installed-PWA");
  });

  it("shows always-visible INSTALL APP with INSTALLING state", () => {
    const src = readFileSync(
      join(root, "components/pwa/install-app-fullscreen.tsx"),
      "utf8",
    );
    expect(src).toContain('"INSTALL APP"');
    expect(src).toContain('"INSTALLING..."');
    expect(src).not.toContain("Continue in Browser");
    expect(src).not.toContain("Skip");
  });

  it("does not mount app children while gate is locked", () => {
    const src = readFileSync(
      join(root, "components/pwa/install-first-gate.tsx"),
      "utf8",
    );
    expect(src).toMatch(/!pwa\?\.appUnlocked[\s\S]*InstallAppFullScreen/);
  });
});
