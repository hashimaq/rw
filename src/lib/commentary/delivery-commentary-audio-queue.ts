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
/** sequence → item (strict play order) */
const readyBySequence = new Map<number, CommentaryQueueItem>();
const blobUrlCache = new Map<string, string>();
const prefetchInFlight = new Set<string>();

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

/** Keep playhead aligned with locally committed real deliveries. */
export function notifyLocalScoringDeliveryCommitted(
  sequenceInInnings: number,
): void {
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
  audio.muted = true;
  void audio
    .play()
    .then(() => {
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
  const cached = blobUrlCache.get(clientEventId);
  if (cached) return cached;
  if (prefetchInFlight.has(clientEventId)) {
    return waitForPrefetch(clientEventId);
  }
  prefetchInFlight.add(clientEventId);

  const committedAt = deliveryCommittedAtForClientEvent(clientEventId);
  logCommentaryClientLatency({
    clientEventId,
    stage: "audio_fetch_started",
    deliveryCommittedAtMs: committedAt,
  });
  const fetchStarted = Date.now();

  try {
    let res: Response | null = null;
    for (let attempt = 0; attempt < 12; attempt += 1) {
      res = await fetch(audioUrlFor(clientEventId), {
        credentials: "include",
      });
      if (res.ok) break;
      if (res.status !== 404) break;
      await new Promise<void>((r) => {
        setTimeout(r, 120);
      });
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
  }
}

function prefetchNextCandidates(): void {
  for (let offset = 0; offset <= 2; offset += 1) {
    const seq = nextSequenceToPlay + offset;
    const item = readyBySequence.get(seq);
    if (!item || cancelled.has(item.clientEventId)) continue;
    void prefetchAudioBlob(item.clientEventId);
  }
}

export function enqueueDeliveryCommentaryReady(item: CommentaryQueueItem): void {
  if (typeof globalThis.window === "undefined") return;
  const baseline = Math.max(
    minSequenceInInnings,
    getCommentaryPlaybackBaselineSequence(),
  );
  if (item.sequenceInInnings < baseline) return;
  if (cancelled.has(item.clientEventId)) return;
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

async function drainCommentaryAudioQueue(): Promise<void> {
  if (playing || typeof globalThis.window === "undefined") return;
  if (drainScheduled) return;
  drainScheduled = true;
  try {
    while (!playing) {
      const item = readyBySequence.get(nextSequenceToPlay);
      if (!item || cancelled.has(item.clientEventId)) {
        if (item && cancelled.has(item.clientEventId)) {
          readyBySequence.delete(nextSequenceToPlay);
          continue;
        }
        logCommentaryClientLatency({
          clientEventId: "queue",
          stage: "metadata_received",
          extra: {
            kind: "queue_drain_blocked",
            nextSequenceToPlay,
            readySequences: [...readyBySequence.keys()]
              .sort((a, b) => a - b)
              .join(","),
          },
        });
        break;
      }

      playing = true;
      const blobUrl =
        (await prefetchAudioBlob(item.clientEventId)) ??
        audioUrlFor(item.clientEventId);
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
          readyBySequence.delete(nextSequenceToPlay);
          lastPlayedSequence = nextSequenceToPlay;
          nextSequenceToPlay += 1;
          playing = false;
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
    if (!playing && readyBySequence.has(nextSequenceToPlay)) {
      scheduleCommentaryAudioDrain();
    }
  }
}

/** Test helper */
export function resetDeliveryCommentaryQueueForTests(): void {
  cancelled.clear();
  readySeen.clear();
  readyBySequence.clear();
  for (const id of blobUrlCache.keys()) revokeBlobUrl(id);
  prefetchInFlight.clear();
  playing = false;
  drainScheduled = false;
  nextSequenceToPlay = 1;
  minSequenceInInnings = 1;
  lastPlayedSequence = 0;
  playheadInningsId = null;
  sharedPlaybackAudio = null;
  drainTail = Promise.resolve();
}

/** Test helper — await playback drain */
export async function drainCommentaryAudioQueueForTests(): Promise<void> {
  scheduleCommentaryAudioDrain();
  await drainTail;
}

/** Test helper — expose strict-order state */
export function commentaryQueueTestState(): {
  nextSequenceToPlay: number;
  readySequences: number[];
} {
  return {
    nextSequenceToPlay,
    readySequences: [...readyBySequence.keys()].sort((a, b) => a - b),
  };
}
