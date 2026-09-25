import { describe, expect, it, vi, afterEach } from "vitest";
import { isInstallFirstGateEnabled } from "@/lib/pwa/install-gate-enabled";
import {
  isRedWingsAppUnlocked,
  resolveInstallPromptMode,
} from "@/lib/pwa/install-first-gate";

describe("install-first PWA gate", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("gate is off in development by default", () => {
    vi.stubEnv("NODE_ENV", "development");
    vi.stubEnv("NEXT_PUBLIC_PWA_INSTALL_GATE_ENABLED", "");
    vi.stubEnv("NEXT_PUBLIC_ALLOW_BROWSER_APP", "");
    expect(isInstallFirstGateEnabled()).toBe(false);
  });

  it("gate is on in production by default", () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("NEXT_PUBLIC_PWA_INSTALL_GATE_ENABLED", "");
    vi.stubEnv("NEXT_PUBLIC_ALLOW_BROWSER_APP", "");
    expect(isInstallFirstGateEnabled()).toBe(true);
  });

  it("allows browser when NEXT_PUBLIC_ALLOW_BROWSER_APP=1", () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("NEXT_PUBLIC_ALLOW_BROWSER_APP", "1");
    expect(isInstallFirstGateEnabled()).toBe(false);
  });

  it("unlocks app only in standalone when gate is on", () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("NEXT_PUBLIC_PWA_INSTALL_GATE_ENABLED", "1");
    expect(isRedWingsAppUnlocked(true, false)).toBe(true);
    expect(isRedWingsAppUnlocked(false, false)).toBe(false);
  });

  it("prefers native prompt when deferred event exists", () => {
    expect(
      resolveInstallPromptMode({
        hasDeferredPrompt: true,
        isIos: true,
        isAndroid: false,
      }),
    ).toBe("native_prompt");
  });

  it("uses iOS manual flow when no deferred prompt", () => {
    expect(
      resolveInstallPromptMode({
        hasDeferredPrompt: false,
        isIos: true,
        isAndroid: false,
      }),
    ).toBe("ios_manual");
  });

  it("uses Android manual guidance when no deferred prompt", () => {
    expect(
      resolveInstallPromptMode({
        hasDeferredPrompt: false,
        isIos: false,
        isAndroid: true,
      }),
    ).toBe("android_manual");
  });

  it("uses desktop manual guidance on unsupported browsers", () => {
    expect(
      resolveInstallPromptMode({
        hasDeferredPrompt: false,
        isIos: false,
        isAndroid: false,
      }),
    ).toBe("manual_unsupported");
  });
});
