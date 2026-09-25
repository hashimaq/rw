import { describe, expect, it } from "vitest";
import {
  isSequenceConflictSyncError,
  sequenceConflictError,
} from "@/lib/sync/delivery-sync-sequence-conflict";

describe("sequence conflict sync errors", () => {
  it("tags stale duplicate queue failures", () => {
    const err = sequenceConflictError("slot taken");
    expect(isSequenceConflictSyncError(err.message)).toBe(true);
  });
});
