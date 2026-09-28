import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  commentaryQueueTestState,
  configureCommentaryPlaybackBaseline,
  drainCommentaryAudioQueueForTests,
  enqueueCommentaryForPlayback,
  isCommentaryPlaybackComplete,
  isCommentarySupersededForScorer,
  notifyLocalScoringDeliveryCommitted,
  resetDeliveryCommentaryQueueForTests,
  setCommentaryPlaybackMode,
  unlockDeliveryCommentaryAudio,
} from "@/lib/commentary/delivery-commentary-audio-queue";
import { resetCommentaryPlaybackBaselineForTests } from "@/lib/commentary/commentary-playback-session";

let playCallCount = 0;
let lastPlaySrc = "";

beforeEach(() => {
  playCallCount = 0;
  lastPlaySrc = "";
  resetDeliveryCommentaryQueueForTests();
  resetCommentaryPlaybackBaselineForTests();
  configureCommentaryPlaybackBaseline({ minSequenceInInnings: 1 });
  setCommentaryPlaybackMode("scorer-latest");
  vi.stubGlobal("window", globalThis);
  vi.stubGlobal("URL", {
    createObjectURL: () => "blob:test",
    revokeObjectURL: () => {},
  });
  class MockAudio {
    preload = "";
    src = "";
    currentTime = 0;
    muted = false;
    addEventListener(_: string, fn: () => void) {
      if (_ === "ended") queueMicrotask(() => fn());
    }
    removeEventListener() {}
    pause() {}
    load() {}
    removeAttribute(name: string) {
      if (name === "src") this.src = "";
    }
    play() {
      playCallCount += 1;
      lastPlaySrc = this.src;
      return Promise.resolve();
    }
  }
  vi.stubGlobal("Audio", MockAudio);
  vi.stubGlobal(
    "fetch",
    vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      headers: {
        get: (name: string) =>
          name.toLowerCase() === "content-type" ? "audio/wav" : null,
      },
      blob: async () => new Blob([new Uint8Array([1])]),
    }),
  );
});

afterEach(async () => {
  try {
    await drainCommentaryAudioQueueForTests();
  } catch {
    /* ignore */
  }
  resetDeliveryCommentaryQueueForTests();
  vi.unstubAllGlobals();
});

describe("commentary playback idempotency", () => {
  it("A: 4 → 6 rapid — only latest plays once", async () => {
    notifyLocalScoringDeliveryCommitted(1, "id-4");
    enqueueCommentaryForPlayback({
      clientEventId: "id-4",
      inningsId: "inn",
      sequenceInInnings: 1,
    });
    notifyLocalScoringDeliveryCommitted(2, "id-6");
    enqueueCommentaryForPlayback({
      clientEventId: "id-6",
      inningsId: "inn",
      sequenceInInnings: 2,
    });
    await drainCommentaryAudioQueueForTests();
    expect(playCallCount).toBe(1);
    expect(isCommentaryPlaybackComplete("id-4")).toBe(false);
    expect(isCommentaryPlaybackComplete("id-6")).toBe(true);
  });

  it("B: 4 plays then 6 — 4 never replays", async () => {
    notifyLocalScoringDeliveryCommitted(1, "id-4");
    enqueueCommentaryForPlayback({
      clientEventId: "id-4",
      inningsId: "inn",
      sequenceInInnings: 1,
    });
    await drainCommentaryAudioQueueForTests();
    expect(playCallCount).toBe(1);
    playCallCount = 0;

    notifyLocalScoringDeliveryCommitted(2, "id-6");
    enqueueCommentaryForPlayback({
      clientEventId: "id-4",
      inningsId: "inn",
      sequenceInInnings: 1,
    });
    enqueueCommentaryForPlayback({
      clientEventId: "id-6",
      inningsId: "inn",
      sequenceInInnings: 2,
    });
    await drainCommentaryAudioQueueForTests();
    expect(playCallCount).toBe(1);
    expect(isCommentaryPlaybackComplete("id-4")).toBe(true);
    expect(isCommentaryPlaybackComplete("id-6")).toBe(true);
  });

  it("E: multiple ready sources enqueue once", async () => {
    const item = {
      clientEventId: "id-4",
      inningsId: "inn",
      sequenceInInnings: 1,
    };
    enqueueCommentaryForPlayback(item);
    enqueueCommentaryForPlayback(item);
    enqueueCommentaryForPlayback(item);
    expect(commentaryQueueTestState().readySequences).toEqual([1]);
    await drainCommentaryAudioQueueForTests();
    expect(playCallCount).toBe(1);
  });

  it("F: late ready after played is dropped", async () => {
    notifyLocalScoringDeliveryCommitted(1, "id-4");
    enqueueCommentaryForPlayback({
      clientEventId: "id-4",
      inningsId: "inn",
      sequenceInInnings: 1,
    });
    await drainCommentaryAudioQueueForTests();
    playCallCount = 0;
    enqueueCommentaryForPlayback({
      clientEventId: "id-4",
      inningsId: "inn",
      sequenceInInnings: 1,
    });
    await drainCommentaryAudioQueueForTests();
    expect(playCallCount).toBe(0);
  });

  it("G: superseded delivery flagged for scorer", () => {
    notifyLocalScoringDeliveryCommitted(2, "id-6");
    expect(isCommentarySupersededForScorer("id-4", 1)).toBe(true);
    expect(isCommentarySupersededForScorer("id-6", 2)).toBe(false);
  });

  it("unlock on second score tap does not replay previous commentary src", async () => {
    unlockDeliveryCommentaryAudio();
    await Promise.resolve();
    playCallCount = 0;

    notifyLocalScoringDeliveryCommitted(1, "id-4");
    enqueueCommentaryForPlayback({
      clientEventId: "id-4",
      inningsId: "inn",
      sequenceInInnings: 1,
    });
    await drainCommentaryAudioQueueForTests();
    expect(playCallCount).toBe(1);

    playCallCount = 0;
    unlockDeliveryCommentaryAudio();
    expect(playCallCount).toBe(0);

    notifyLocalScoringDeliveryCommitted(2, "id-6");
    enqueueCommentaryForPlayback({
      clientEventId: "id-6",
      inningsId: "inn",
      sequenceInInnings: 2,
    });
    await drainCommentaryAudioQueueForTests();
    expect(playCallCount).toBe(1);
    expect(isCommentaryPlaybackComplete("id-4")).toBe(true);
  });
});
