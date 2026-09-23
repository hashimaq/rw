import { describe, expect, it } from "vitest";
import {
  isInstallFirstGateEnabled,
  isRedWingsAppUnlocked,
  resolveInstallPromptMode,
} from "@/lib/pwa/install-first-gate";

describe("install-first PWA gate", () => {
  it("gate is disabled by default for development", () => {
    expect(isInstallFirstGateEnabled()).toBe(false);
  });

  it("locks app in browser only when gate env is enabled", () => {
    expect(isRedWingsAppUnlocked(true, false)).toBe(true);
  });

  it("allows browser when install gate env is off", () => {
    expect(isRedWingsAppUnlocked(false, false)).toBe(true);
  });

  it("prefers native prompt when deferred event exists", () => {
    expect(
      resolveInstallPromptMode({ hasDeferredPrompt: true, isIos: true }),
    ).toBe("native_prompt");
  });

  it("uses iOS manual flow when no deferred prompt", () => {
    expect(
      resolveInstallPromptMode({ hasDeferredPrompt: false, isIos: true }),
    ).toBe("ios_manual");
  });

  it("uses manual guidance on unsupported desktop browsers", () => {
    expect(
      resolveInstallPromptMode({ hasDeferredPrompt: false, isIos: false }),
    ).toBe("manual_unsupported");
  });
});
