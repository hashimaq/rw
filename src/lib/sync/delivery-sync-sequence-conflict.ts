/** Thrown when server already has another delivery at this innings sequence (stale queue row). */
export const SEQUENCE_CONFLICT_PREFIX = "sequence_conflict:";

export function sequenceConflictError(detail: string): Error {
  return new Error(`${SEQUENCE_CONFLICT_PREFIX}${detail}`);
}

export function isSequenceConflictSyncError(message: string): boolean {
  return message.startsWith(SEQUENCE_CONFLICT_PREFIX);
}
