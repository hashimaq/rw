import { describe, expect, it } from "vitest";
import {
  deliverySyncFailureOutcome,
  isNonRetryableSyncError,
} from "@/lib/sync/delivery-sync-outcome";

describe("deliverySyncFailureOutcome", () => {
  it("keeps transient errors pending for automatic retry", () => {
    const o = deliverySyncFailureOutcome("Sync failed (500)");
    expect(o.status).toBe("pending");
    expect(o.autoRetryBlocked).toBe(false);
  });

  it("keeps match mismatch pending (retry when correct match/session)", () => {
    const o = deliverySyncFailureOutcome("Match mismatch");
    expect(o.status).toBe("pending");
    expect(o.autoRetryBlocked).toBe(false);
  });

  it("marks controller loss failed and blocks auto retry", () => {
    const o = deliverySyncFailureOutcome(
      "This device is not the active scoring controller",
    );
    expect(o.status).toBe("failed");
    expect(o.autoRetryBlocked).toBe(true);
    expect(o.last_error).toContain("another device");
  });

  it("marks deleted match failed and blocks auto retry", () => {
    const o = deliverySyncFailureOutcome(
      "match_removed:This match was deleted and cannot receive updates.",
    );
    expect(o.status).toBe("failed");
    expect(o.autoRetryBlocked).toBe(true);
  });
});

describe("isNonRetryableSyncError", () => {
  it("blocks automatic requeue for controller loss", () => {
    expect(
      isNonRetryableSyncError(
        "Scoring control moved to another device. These updates were not applied.",
      ),
    ).toBe(true);
  });

  it("allows requeue for generic 403 message", () => {
    expect(isNonRetryableSyncError("Match mismatch")).toBe(false);
  });
});
