import { describe, expect, it } from "vitest";
import {
  isRedWingsAppUnlocked,
  resolveInstallPromptMode,
} from "@/lib/pwa/install-first-gate";

describe("install-first PWA gate", () => {
  it("locks app in browser until standalone", () => {
    expect(isRedWingsAppUnlocked(false, false)).toBe(false);
    expect(isRedWingsAppUnlocked(true, false)).toBe(true);
  });

  it("allows dev bypass only when enabled", () => {
    expect(isRedWingsAppUnlocked(false, true)).toBe(true);
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
