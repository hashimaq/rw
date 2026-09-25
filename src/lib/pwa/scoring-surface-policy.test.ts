import { describe, expect, it, vi, afterEach } from "vitest";
import { isScoringRequiresInstalledClient } from "@/lib/pwa/scoring-surface-policy";

describe("isScoringRequiresInstalledClient", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("allows browser scoring in development by default", () => {
    vi.stubEnv("NODE_ENV", "development");
    vi.stubEnv("NEXT_PUBLIC_SCORING_REQUIRES_PWA", "");
    vi.stubEnv("NEXT_PUBLIC_ALLOW_BROWSER_APP", "");
    expect(isScoringRequiresInstalledClient()).toBe(false);
  });

  it("requires installed client in production by default", () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("NEXT_PUBLIC_SCORING_REQUIRES_PWA", "");
    expect(isScoringRequiresInstalledClient()).toBe(true);
  });

  it("honours explicit opt-out in production", () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("NEXT_PUBLIC_SCORING_REQUIRES_PWA", "0");
    expect(isScoringRequiresInstalledClient()).toBe(false);
  });

  it("honours browser bypass flag", () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("NEXT_PUBLIC_ALLOW_BROWSER_APP", "1");
    expect(isScoringRequiresInstalledClient()).toBe(false);
  });
});
