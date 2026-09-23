/** Pure sync-queue update rules after a failed delivery POST (testable, no I/O). */

export type SyncQueueFailureOutcome = {
  status: "pending" | "failed";
  last_error: string;
  /** Automatic interval flush should not retry until explicit requeue. */
  autoRetryBlocked: boolean;
};

export function isNonRetryableSyncError(lastError: string | null): boolean {
  if (!lastError) return false;
  return (
    lastError.startsWith("match_removed:") ||
    lastError.includes("This match was deleted") ||
    lastError.includes("Scoring control moved to another device")
  );
}

export function deliverySyncFailureOutcome(message: string): SyncQueueFailureOutcome {
  const matchRemoved = message.startsWith("match_removed:");
  const lostControl =
    message.includes("not the active scoring controller") ||
    message.includes("not_scoring_controller");

  if (matchRemoved) {
    return {
      status: "failed",
      last_error: "This match was deleted. Pending updates were discarded.",
      autoRetryBlocked: true,
    };
  }
  if (lostControl) {
    return {
      status: "failed",
      last_error:
        "Scoring control moved to another device. These updates were not applied.",
      autoRetryBlocked: true,
    };
  }
  return {
    status: "pending",
    last_error: message,
    autoRetryBlocked: false,
  };
}
