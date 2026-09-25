"use client";

/** Frozen at innings session start — do not advance when bootstrap/cache updates. */
let playbackBaselineSequence = 1;

export function getCommentaryPlaybackBaselineSequence(): number {
  return playbackBaselineSequence;
}

export function initCommentaryPlaybackBaselineOnce(
  inningsId: string,
  minSequenceInInnings: number,
  lastInningsId: { current: string | null },
): void {
  if (lastInningsId.current !== inningsId) {
    lastInningsId.current = inningsId;
    playbackBaselineSequence = Math.max(1, minSequenceInInnings);
  }
}

export function mergeCommentaryPlaybackBaselineFloor(
  minSequenceInInnings: number,
): void {
  playbackBaselineSequence = Math.max(
    1,
    playbackBaselineSequence,
    minSequenceInInnings,
  );
}

export function resetCommentaryPlaybackBaselineForTests(): void {
  playbackBaselineSequence = 1;
}
