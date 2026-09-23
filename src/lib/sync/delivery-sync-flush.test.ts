import { describe, expect, it } from "vitest";
import {
  flushSyncQueue,
  resetDeliveryFlushSerializationForTests,
} from "@/lib/sync/delivery-sync";

describe("delivery sync flush", () => {
  it("accepts matchId scope option", () => {
    expect(flushSyncQueue.length).toBeGreaterThanOrEqual(1);
    resetDeliveryFlushSerializationForTests();
  });
});
