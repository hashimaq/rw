import { describe, expect, it } from "vitest";
import { mergeSessionStatusForOffline } from "@/lib/pwa/session-status-offline";

describe("offline scoring session cache", () => {
  it("keeps controller role when offline and fetch failed", () => {
    const cached = {
      authorized: true,
      scoring_role: "controller" as const,
      has_active_controller: true,
      cached_at: new Date().toISOString(),
    };
    const merged = mergeSessionStatusForOffline(null, cached, false);
    expect(merged?.scoring_role).toBe("controller");
  });

  it("uses live status when online", () => {
    const live = {
      authorized: true,
      scoring_role: "viewer" as const,
      has_active_controller: true,
      cached_at: new Date().toISOString(),
    };
    const cached = {
      authorized: true,
      scoring_role: "controller" as const,
      has_active_controller: true,
      cached_at: new Date().toISOString(),
    };
    const merged = mergeSessionStatusForOffline(live, cached, true);
    expect(merged?.scoring_role).toBe("viewer");
  });
});
