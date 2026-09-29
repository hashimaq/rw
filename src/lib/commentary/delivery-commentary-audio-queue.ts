"use client";

import {
  deliveryCommittedAtForClientEvent,
  logCommentaryClientLatency,
} from "@/lib/commentary/commentary-latency-client";
import { getCommentaryPlaybackBaselineSequence } from "@/lib/commentary/commentary-playback-session";

const MAX_READY = 16;
const MAX_BLOB_CACHE = 16;

export type CommentaryQueueItem = {
  clientEventId: string;
  inningsId: string;
  sequenceInInnings: number;
};

const cancelled = new Set<string>();
const readySeen = new Set<string>();
const playedClientEventIds = new Set<string>();
/** Active scorer: superseded before playback — never play or enqueue. */
const staleSuperseded = new Set<string>();
/** sequence → item (strict play order) */
const readyBySequence = new Map<number, CommentaryQueueItem>();
const blobUrlCache = new Map<string, string>();
const prefetchInFlight = new Set<string>();
const prefetchAbortByClientEventId = new Map<string, AbortController>();
/** Controller signalled audio exists — skip 404 retry backoff. */
const audioKnownReady = new Set<string>();

export type CommentaryPlaybackMode = "strict" | "scorer-latest";

let playbackMode: CommentaryPlaybackMode = "strict";
let latestScoredSequence = 0;
let latestScoredClientEventId: string | null = null;
let currentlyPlayingSequence: number | null = null;
/** After first successful unlock play(), further score taps must not call audio.play(). */
let scorerAudioUnlocked = false;

let playing = false;
/** Reused for unlock + playback so autoplay policy stays satisfied after scorer taps. */
let sharedPlaybackAudio: HTMLAudioElement | null = null;
let drainScheduled = false;
let nextSequenceToPlay = 1;
let minSequenceInInnings = 1;
let lastPlayedSequence = 0;
let playheadInningsId: string | null = null;
let drainTail: Promise<void> = Promise.resolve();

function scheduleCommentaryAudioDrain(): void {
  drainTail = drainTail.then(() => drainCommentaryAudioQueue());
  void drainTail;
}

export function setCommentaryPlaybackMode(mode: CommentaryPlaybackMode): void {
  playbackMode = mode;
}

export function isCommentaryPlaybackComplete(clientEventId: string): boolean {
  return playedClientEventIds.has(clientEventId);
}

export function markCommentaryAudioKnownReady(clientEventId: string): void {
  audioKnownReady.add(clientEventId);
}

export function isCommentarySupersededForScorer(
  clientEventId: string,
  sequenceInInnings: number,
): boolean {
  if (playbackMode !== "scorer-latest") return false;
  if (staleSuperseded.has(clientEventId)) return true;
  if (
    latestScoredSequence > 0 &&
    sequenceInInnings < latestScoredSequence &&
    clientEventId !== latestScoredClientEventId
  ) {
    return true;
  }
  return false;
}

export function configureCommentaryPlaybackBaseline(options: {
  minSequenceInInnings: number;
  inningsId?: string;
}): void {
  const min = Math.max(1, options.minSequenceInInnings);
  if (options.inningsId && options.inningsId !== playheadInningsId) {
    playheadInningsId = options.inningsId;
    minSequenceInInnings = min;
    nextSequenceToPlay = min;
    return;
  }
  if (playheadInningsId == null) {
    minSequenceInInnings = min;
    nextSequenceToPlay = min;
    playheadInningsId = options.inningsId ?? playheadInningsId;
    return;
  }
  /** Same innings: keep playhead + enqueue floor — do not advance when min grows. */
}

function hasReadyCommentaryBetween(fromSeq: number, toSeq: number): boolean {
  for (let s = fromSeq; s < toSeq; s += 1) {
    if (readyBySequence.has(s)) return true;
  }
  return false;
}

function abortPrefetch(clientEventId: string): void {
  const controller = prefetchAbortByClientEventId.get(clientEventId);
  if (controller) {
    controller.abort();
    prefetchAbortByClientEventId.delete(clientEventId);
  }
  prefetchInFlight.delete(clientEventId);
}

function markStaleSuperseded(item: CommentaryQueueItem): void {
  staleSuperseded.add(item.clientEventId);
  abortPrefetch(item.clientEventId);
  revokeBlobUrl(item.clientEventId);
}

/** Drop pending commentary older than the scorer's latest committed ball. */
function invalidateStaleScorerPendingCommentary(): void {
  if (playbackMode !== "scorer-latest" || latestScoredSequence <= 0) return;

  for (const [seq, item] of readyBySequence) {
    if (seq >= latestScoredSequence) continue;
    if (seq === currentlyPlayingSequence) continue;
    markStaleSuperseded(item);
    readyBySequence.delete(seq);
  }

  while (
    nextSequenceToPlay < latestScoredSequence &&
    !readyBySequence.has(nextSequenceToPlay)
  ) {
    nextSequenceToPlay += 1;
  }
}

function isStaleForScorerPlayback(
  item: CommentaryQueueItem,
): boolean {
  if (playbackMode !== "scorer-latest") return false;
  if (staleSuperseded.has(item.clientEventId)) return true;
  if (item.sequenceInInnings < latestScoredSequence) {
    return item.sequenceInInnings !== currentlyPlayingSequence;
  }
  return false;
}

function scorerPlaybackTargetSequence(): number | null {
  if (playbackMode !== "scorer-latest") return null;
  if (latestScoredSequence < minSequenceInInnings) return null;
  return latestScoredSequence;
}

/** Keep playhead aligned with locally committed real deliveries. */
export function notifyLocalScoringDeliveryCommitted(
  sequenceInInnings: number,
  clientEventId?: string,
): void {
  if (playbackMode === "scorer-latest") {
    latestScoredSequence = Math.max(latestScoredSequence, sequenceInInnings);
    if (clientEventId) {
      latestScoredClientEventId = clientEventId;
    }
    invalidateStaleScorerPendingCommentary();
    scheduleCommentaryAudioDrain();
    return;
  }

  if (nextSequenceToPlay > sequenceInInnings) {
    nextSequenceToPlay = sequenceInInnings;
  }
  if (
    nextSequenceToPlay < sequenceInInnings &&
    !hasReadyCommentaryBetween(nextSequenceToPlay, sequenceInInnings)
  ) {
    nextSequenceToPlay = sequenceInInnings;
  }
}

function ensureSharedPlaybackAudio(): HTMLAudioElement {
  if (!sharedPlaybackAudio) {
    sharedPlaybackAudio = new Audio();
    sharedPlaybackAudio.preload = "auto";
  }
  return sharedPlaybackAudio;
}

export function unlockDeliveryCommentaryAudio(): void {
  if (typeof globalThis.window === "undefined") return;
  const audio = ensureSharedPlaybackAudio();
  if (scorerAudioUnlocked) {
    scheduleCommentaryAudioDrain();
    return;
  }
  audio.pause();
  audio.currentTime = 0;
  if (audio.src) {
    audio.removeAttribute("src");
    audio.load();
  }
  audio.muted = true;
  void audio
    .play()
    .then(() => {
      scorerAudioUnlocked = true;
      audio.muted = false;
      logCommentaryClientLatency({
        clientEventId: "unlock",
        stage: "playback_started",
        extra: { kind: "audio_unlock_resolved" },
      });
      scheduleCommentaryAudioDrain();
    })
    .catch((err: unknown) => {
      logCommentaryClientLatency({
        clientEventId: "unlock",
        stage: "metadata_received",
        extra: {
          kind: "audio_unlock_rejected",
          error: err instanceof Error ? err.name : String(err),
          message: err instanceof Error ? err.message : "",
        },
      });
    });
}

export function cancelDeliveryCommentaryPlayback(clientEventId: string): void {
  cancelled.add(clientEventId);
  abortPrefetch(clientEventId);
  for (const [seq, item] of readyBySequence) {
    if (item.clientEventId === clientEventId) {
      readyBySequence.delete(seq);
      if (seq <= nextSequenceToPlay) {
        nextSequenceToPlay = seq;
        lastPlayedSequence = seq - 1;
      }
      break;
    }
  }
  revokeBlobUrl(clientEventId);
}

function revokeBlobUrl(clientEventId: string): void {
  const url = blobUrlCache.get(clientEventId);
  if (url) {
    URL.revokeObjectURL(url);
    blobUrlCache.delete(clientEventId);
  }
}

function trimReadyIfNeeded(): void {
  if (readyBySequence.size <= MAX_READY) return;
  const sorted = [...readyBySequence.keys()].sort((a, b) => a - b);
  while (readyBySequence.size > MAX_READY && sorted.length > 0) {
    const dropSeq = sorted.pop()!;
    const item = readyBySequence.get(dropSeq);
    readyBySequence.delete(dropSeq);
    if (item) revokeBlobUrl(item.clientEventId);
  }
}

function audioUrlFor(clientEventId: string): string {
  return `/api/scoring/delivery-commentary/${encodeURIComponent(clientEventId)}/audio`;
}

async function waitForPrefetch(clientEventId: string): Promise<string | null> {
  for (let i = 0; i < 40; i += 1) {
    if (staleSuperseded.has(clientEventId)) return null;
    const cached = blobUrlCache.get(clientEventId);
    if (cached) return cached;
    if (!prefetchInFlight.has(clientEventId)) return null;
    await new Promise<void>((r) => {
      setTimeout(r, 50);
    });
  }
  return blobUrlCache.get(clientEventId) ?? null;
}

async function prefetchAudioBlob(clientEventId: string): Promise<string | null> {
  if (staleSuperseded.has(clientEventId)) return null;

  const cached = blobUrlCache.get(clientEventId);
  if (cached) return cached;
  if (prefetchInFlight.has(clientEventId)) {
    return waitForPrefetch(clientEventId);
  }
  prefetchInFlight.add(clientEventId);

  const abortController = new AbortController();
  prefetchAbortByClientEventId.set(clientEventId, abortController);

  const committedAt = deliveryCommittedAtForClientEvent(clientEventId);
  logCommentaryClientLatency({
    clientEventId,
    stage: "audio_fetch_started",
    deliveryCommittedAtMs: committedAt,
  });
  const fetchStarted = Date.now();

  try {
    const knownReady = audioKnownReady.has(clientEventId);
    const maxAttempts = knownReady ? 2 : 6;
    let res: Response | null = null;
    for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
      if (abortController.signal.aborted || staleSuperseded.has(clientEventId)) {
        return null;
      }
      res = await fetch(audioUrlFor(clientEventId), {
        credentials: "include",
        signal: abortController.signal,
      });
      if (res.ok) break;
      if (res.status !== 404) break;
      if (knownReady || attempt + 1 >= maxAttempts) break;
      await new Promise<void>((r) => {
        setTimeout(r, 40);
      });
    }
    audioKnownReady.delete(clientEventId);
    if (staleSuperseded.has(clientEventId) || abortController.signal.aborted) {
      return null;
    }
    if (!res || !res.ok) {
      logCommentaryClientLatency({
        clientEventId,
        stage: "audio_fetch_done",
        deliveryCommittedAtMs: committedAt,
        extra: {
          ok: false,
          status: res?.status ?? 0,
          contentType: res?.headers.get("content-type") ?? null,
        },
      });
      return null;
    }
    const blob = await res.blob();
    const contentType = res.headers.get("content-type");
    while (blobUrlCache.size >= MAX_BLOB_CACHE) {
      const oldest = blobUrlCache.keys().next().value;
      if (oldest) revokeBlobUrl(oldest);
      else break;
    }
    if (staleSuperseded.has(clientEventId)) {
      return null;
    }
    const url = URL.createObjectURL(blob);
    blobUrlCache.set(clientEventId, url);
    logCommentaryClientLatency({
      clientEventId,
      stage: "audio_fetch_done",
      deliveryCommittedAtMs: committedAt,
      extra: {
        durationMs: Date.now() - fetchStarted,
        ok: true,
        status: res.status,
        contentType,
        byteLength: blob.size,
        source: res.headers.get("x-rw-commentary-source"),
      },
    });
    return url;
  } catch (err: unknown) {
    if (
      abortController.signal.aborted ||
      (err instanceof DOMException && err.name === "AbortError")
    ) {
      return null;
    }
    logCommentaryClientLatency({
      clientEventId,
      stage: "audio_fetch_done",
      deliveryCommittedAtMs: committedAt,
      extra: {
        ok: false,
        error: err instanceof Error ? err.message : String(err),
      },
    });
    return null;
  } finally {
    prefetchInFlight.delete(clientEventId);
    prefetchAbortByClientEventId.delete(clientEventId);
  }
}

function prefetchNextCandidates(): void {
  const sequences =
    playbackMode === "scorer-latest" && latestScoredSequence > 0
      ? [latestScoredSequence]
      : [nextSequenceToPlay, nextSequenceToPlay + 1, nextSequenceToPlay + 2];
  for (const seq of sequences) {
    const item = readyBySequence.get(seq);
    if (!item || cancelled.has(item.clientEventId)) continue;
    if (isStaleForScorerPlayback(item)) continue;
    void prefetchAudioBlob(item.clientEventId);
  }
}

/** Single gate for all commentary playback enqueue sources. */
export function enqueueCommentaryForPlayback(item: CommentaryQueueItem): void {
  if (typeof globalThis.window === "undefined") return;
  if (playedClientEventIds.has(item.clientEventId)) {
    logCommentaryClientLatency({
      clientEventId: item.clientEventId,
      stage: "metadata_received",
      sequenceInInnings: item.sequenceInInnings,
      extra: { kind: "enqueue_dropped_already_played" },
    });
    return;
  }
  const baseline = Math.max(
    minSequenceInInnings,
    getCommentaryPlaybackBaselineSequence(),
  );
  if (item.sequenceInInnings < baseline) return;
  if (cancelled.has(item.clientEventId)) return;
  if (staleSuperseded.has(item.clientEventId)) return;
  if (
    isCommentarySupersededForScorer(
      item.clientEventId,
      item.sequenceInInnings,
    )
  ) {
    staleSuperseded.add(item.clientEventId);
    return;
  }
  if (
    playbackMode === "scorer-latest" &&
    latestScoredSequence > 0 &&
    item.sequenceInInnings < latestScoredSequence
  ) {
    staleSuperseded.add(item.clientEventId);
    return;
  }
  if (readySeen.has(item.clientEventId)) return;
  readySeen.add(item.clientEventId);

  const committedAt = deliveryCommittedAtForClientEvent(item.clientEventId);
  logCommentaryClientLatency({
    clientEventId: item.clientEventId,
    stage: "metadata_received",
    deliveryCommittedAtMs: committedAt,
    sequenceInInnings: item.sequenceInInnings,
  });

  readyBySequence.set(item.sequenceInInnings, item);
  invalidateStaleScorerPendingCommentary();
  logCommentaryClientLatency({
    clientEventId: item.clientEventId,
    stage: "metadata_received",
    deliveryCommittedAtMs: committedAt,
    sequenceInInnings: item.sequenceInInnings,
    extra: {
      kind: "queue_enqueued",
      nextSequenceToPlay,
      readySequences: [...readyBySequence.keys()]
        .sort((a, b) => a - b)
        .join(","),
    },
  });
  trimReadyIfNeeded();
  prefetchNextCandidates();
  scheduleCommentaryAudioDrain();
}

/** @deprecated Use enqueueCommentaryForPlayback */
export const enqueueDeliveryCommentaryReady = enqueueCommentaryForPlayback;

async function drainCommentaryAudioQueue(): Promise<void> {
  if (playing || typeof globalThis.window === "undefined") return;
  if (drainScheduled) return;
  drainScheduled = true;
  try {
    while (!playing) {
      invalidateStaleScorerPendingCommentary();

      const scorerTarget = scorerPlaybackTargetSequence();
      const playSequence =
        playbackMode === "scorer-latest" && scorerTarget != null
          ? scorerTarget
          : nextSequenceToPlay;

      const item = readyBySequence.get(playSequence);
      if (item && cancelled.has(item.clientEventId)) {
        readyBySequence.delete(playSequence);
        continue;
      }
      if (!item) {
        logCommentaryClientLatency({
          clientEventId: "queue",
          stage: "metadata_received",
          extra: {
            kind: "queue_drain_blocked",
            nextSequenceToPlay,
            playSequence,
            playbackMode,
            latestScoredSequence,
            readySequences: [...readyBySequence.keys()]
              .sort((a, b) => a - b)
              .join(","),
          },
        });
        break;
      }

      if (isStaleForScorerPlayback(item)) {
        markStaleSuperseded(item);
        readyBySequence.delete(playSequence);
        continue;
      }

      if (playedClientEventIds.has(item.clientEventId)) {
        readyBySequence.delete(playSequence);
        lastPlayedSequence = playSequence;
        if (playbackMode === "scorer-latest") {
          scheduleCommentaryAudioDrain();
        } else {
          nextSequenceToPlay += 1;
        }
        continue;
      }

      playing = true;
      /** Set before prefetch so stale invalidation does not drop in-flight audio. */
      currentlyPlayingSequence = playSequence;
      const blobUrl =
        (await prefetchAudioBlob(item.clientEventId)) ??
        audioUrlFor(item.clientEventId);

      if (isStaleForScorerPlayback(item)) {
        markStaleSuperseded(item);
        readyBySequence.delete(playSequence);
        playing = false;
        currentlyPlayingSequence = null;
        continue;
      }

      if (playedClientEventIds.has(item.clientEventId)) {
        readyBySequence.delete(playSequence);
        playing = false;
        currentlyPlayingSequence = null;
        continue;
      }

      playedClientEventIds.add(item.clientEventId);

      const audio = ensureSharedPlaybackAudio();
      audio.preload = "auto";
      audio.muted = false;
      audio.pause();
      audio.currentTime = 0;
      audio.src = blobUrl;

      await new Promise<void>((resolve) => {
        let settled = false;
        const finish = (reason?: string) => {
          if (settled) return;
          settled = true;
          audio.removeEventListener("ended", onEnded);
          audio.removeEventListener("error", onError);
          readyBySequence.delete(playSequence);
          lastPlayedSequence = playSequence;
          nextSequenceToPlay = playSequence + 1;
          playing = false;
          currentlyPlayingSequence = null;
          if (reason) {
            logCommentaryClientLatency({
              clientEventId: item.clientEventId,
              stage: "metadata_received",
              deliveryCommittedAtMs: deliveryCommittedAtForClientEvent(
                item.clientEventId,
              ),
              sequenceInInnings: item.sequenceInInnings,
              extra: { kind: "playback_ended", reason },
            });
          }
          resolve();
        };
        const onEnded = () => finish("ended");
        const onError = () => finish("error");
        audio.addEventListener("ended", onEnded);
        audio.addEventListener("error", onError);
        audio.addEventListener(
          "playing",
          () => {
            logCommentaryClientLatency({
              clientEventId: item.clientEventId,
              stage: "playback_started",
              deliveryCommittedAtMs: deliveryCommittedAtForClientEvent(
                item.clientEventId,
              ),
              sequenceInInnings: item.sequenceInInnings,
            });
          },
          { once: true },
        );
        logCommentaryClientLatency({
          clientEventId: item.clientEventId,
          stage: "playback_started",
          deliveryCommittedAtMs: deliveryCommittedAtForClientEvent(
            item.clientEventId,
          ),
          sequenceInInnings: item.sequenceInInnings,
          extra: { kind: "play_invoked" },
        });
        void audio
          .play()
          .then(() => {
            logCommentaryClientLatency({
              clientEventId: item.clientEventId,
              stage: "metadata_received",
              deliveryCommittedAtMs: deliveryCommittedAtForClientEvent(
                item.clientEventId,
              ),
              sequenceInInnings: item.sequenceInInnings,
              extra: { kind: "play_resolved" },
            });
          })
          .catch((err: unknown) => {
            playedClientEventIds.delete(item.clientEventId);
            logCommentaryClientLatency({
              clientEventId: item.clientEventId,
              stage: "metadata_received",
              deliveryCommittedAtMs: deliveryCommittedAtForClientEvent(
                item.clientEventId,
              ),
              sequenceInInnings: item.sequenceInInnings,
              extra: {
                kind: "play_rejected",
                error: err instanceof Error ? err.name : String(err),
                message: err instanceof Error ? err.message : "",
              },
            });
            finish("play_rejected");
          });
      });

      prefetchNextCandidates();
    }
  } finally {
    drainScheduled = false;
    const hasPending =
      playbackMode === "scorer-latest" && latestScoredSequence > 0
        ? readyBySequence.has(latestScoredSequence)
        : readyBySequence.has(nextSequenceToPlay);
    if (!playing && hasPending) {
      scheduleCommentaryAudioDrain();
    }
  }
}

/** Test helper */
export function resetDeliveryCommentaryQueueForTests(): void {
  cancelled.clear();
  readySeen.clear();
  playedClientEventIds.clear();
  staleSuperseded.clear();
  readyBySequence.clear();
  for (const id of blobUrlCache.keys()) revokeBlobUrl(id);
  for (const id of prefetchAbortByClientEventId.keys()) abortPrefetch(id);
  prefetchAbortByClientEventId.clear();
  prefetchInFlight.clear();
  audioKnownReady.clear();
  playing = false;
  drainScheduled = false;
  nextSequenceToPlay = 1;
  minSequenceInInnings = 1;
  lastPlayedSequence = 0;
  latestScoredSequence = 0;
  latestScoredClientEventId = null;
  currentlyPlayingSequence = null;
  scorerAudioUnlocked = false;
  playbackMode = "strict";
  playheadInningsId = null;
  sharedPlaybackAudio = null;
  drainTail = Promise.resolve();
}

/** Test helper — await playback drain */
export async function drainCommentaryAudioQueueForTests(): Promise<void> {
  scheduleCommentaryAudioDrain();
  await drainTail;
}

/** Test helper — simulate audio already playing for a sequence. */
export function setCurrentlyPlayingSequenceForTests(
  sequence: number | null,
): void {
  currentlyPlayingSequence = sequence;
}

/** Test helper — expose strict-order state */
export function commentaryQueueTestState(): {
  nextSequenceToPlay: number;
  readySequences: number[];
  playedClientEventIds: string[];
  latestScoredSequence: number;
  staleSuperseded: string[];
} {
  return {
    nextSequenceToPlay,
    readySequences: [...readyBySequence.keys()].sort((a, b) => a - b),
    playedClientEventIds: [...playedClientEventIds],
    latestScoredSequence,
    staleSuperseded: [...staleSuperseded],
  };
}
