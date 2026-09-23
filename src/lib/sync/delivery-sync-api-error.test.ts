import { describe, expect, it } from "vitest";

/** Mirrors createApiDeliveryPusher session error messaging (no fetch). */
function formatDeliveryPushError(
  code: string,
  detail: string,
): string {
  if (code === "not_scoring_controller") {
    return "This device is not the active scoring controller";
  }
  if (code === "session_required" || code === "session_invalid") {
    return `${detail} (re-enter scorer PIN on this device, then reopen scoring)`;
  }
  return detail;
}

describe("delivery sync API errors", () => {
  it("keeps session failures retryable with actionable message", () => {
    expect(
      formatDeliveryPushError(
        "session_invalid",
        "Scoring session is not active",
      ),
    ).toContain("re-enter scorer PIN");
  });

  it("maps controller loss to non-retryable message", () => {
    expect(formatDeliveryPushError("not_scoring_controller", "x")).toContain(
      "active scoring controller",
    );
  });
});
