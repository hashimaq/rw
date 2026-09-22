import { describe, expect, it } from "vitest";
import {
  PWA_INSTALL_DISMISS_COOLDOWN_MS,
  resolveInstallUiMode,
  shouldAutoPresentFullScreenInstall,
  shouldShowInstallAfterDismiss,
} from "@/lib/pwa/install-state";

describe("PWA full-screen install state", () => {
  it("hides when already installed", () => {
    expect(
      resolveInstallUiMode({
        standalone: true,
        dismissedRecently: false,
        hasDeferredPrompt: true,
        isIos: false,
      }),
    ).toBe("hidden_installed");
  });

  it("respects dismiss cooldown", () => {
    const now = 1_000_000;
    expect(shouldShowInstallAfterDismiss(null, now)).toBe(true);
    expect(
      shouldShowInstallAfterDismiss(
        now - PWA_INSTALL_DISMISS_COOLDOWN_MS + 1,
        now,
      ),
    ).toBe(false);
  });

  it("prefers native prompt when available", () => {
    expect(
      resolveInstallUiMode({
        standalone: false,
        dismissedRecently: false,
        hasDeferredPrompt: true,
        isIos: true,
      }),
    ).toBe("native_prompt");
  });

  it("auto-presents full screen for eligible modes", () => {
    expect(
      shouldAutoPresentFullScreenInstall({
        uiMode: "native_prompt",
        sessionSkipped: false,
        forceShow: false,
      }),
    ).toBe(true);
    expect(
      shouldAutoPresentFullScreenInstall({
        uiMode: "native_prompt",
        sessionSkipped: true,
        forceShow: false,
      }),
    ).toBe(false);
    expect(
      shouldAutoPresentFullScreenInstall({
        uiMode: "hidden_dismissed",
        sessionSkipped: false,
        forceShow: true,
      }),
    ).toBe(true);
  });
});
