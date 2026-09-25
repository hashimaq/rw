import { describe, expect, it, vi, afterEach } from "vitest";
import { isInstallFirstGateEnabled } from "@/lib/pwa/install-gate-enabled";

describe("isInstallFirstGateEnabled", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("honours explicit opt-out in production", () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("NEXT_PUBLIC_PWA_INSTALL_GATE_ENABLED", "0");
    expect(isInstallFirstGateEnabled()).toBe(false);
  });

  it("honours explicit opt-in in development", () => {
    vi.stubEnv("NODE_ENV", "development");
    vi.stubEnv("NEXT_PUBLIC_PWA_INSTALL_GATE_ENABLED", "1");
    expect(isInstallFirstGateEnabled()).toBe(true);
  });
});
