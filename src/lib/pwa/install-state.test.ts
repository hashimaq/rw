import { describe, expect, it } from "vitest";
import {
  PWA_INSTALL_DISMISS_COOLDOWN_MS,
  resolveInstallUiMode,
  shouldShowInstallBannerAfterDismiss,
} from "@/lib/pwa/install-state";

describe("PWA install banner state", () => {
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
    expect(shouldShowInstallBannerAfterDismiss(null, now)).toBe(true);
    expect(
      shouldShowInstallBannerAfterDismiss(
        now - PWA_INSTALL_DISMISS_COOLDOWN_MS + 1,
        now,
      ),
    ).toBe(false);
    expect(
      shouldShowInstallBannerAfterDismiss(
        now - PWA_INSTALL_DISMISS_COOLDOWN_MS - 1,
        now,
      ),
    ).toBe(true);
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

  it("shows iOS manual when no deferred prompt", () => {
    expect(
      resolveInstallUiMode({
        standalone: false,
        dismissedRecently: false,
        hasDeferredPrompt: false,
        isIos: true,
      }),
    ).toBe("ios_manual");
  });
});
