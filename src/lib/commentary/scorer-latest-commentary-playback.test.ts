import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  commentaryQueueTestState,
  configureCommentaryPlaybackBaseline,
  drainCommentaryAudioQueueForTests,
  enqueueDeliveryCommentaryReady,
  notifyLocalScoringDeliveryCommitted,
  resetDeliveryCommentaryQueueForTests,
  setCommentaryPlaybackMode,
  setCurrentlyPlayingSequenceForTests,
} from "@/lib/commentary/delivery-commentary-audio-queue";
import { resetCommentaryPlaybackBaselineForTests } from "@/lib/commentary/commentary-playback-session";

let playCallCount = 0;

beforeEach(() => {
  playCallCount = 0;
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
    addEventListener(_: string, fn: () => void) {
      if (_ === "ended") {
        queueMicrotask(() => fn());
      }
    }
    removeEventListener() {}
    pause() {}
    play() {
      playCallCount += 1;
      return Promise.resolve();
    }
  }
  vi.stubGlobal("Audio", MockAudio);
});

afterEach(async () => {
  try {
    await drainCommentaryAudioQueueForTests();
  } catch {
    /* drain may fail if globals were already torn down */
  }
  resetDeliveryCommentaryQueueForTests();
  vi.unstubAllGlobals();
});

function mockFetchOk(): void {
  vi.stubGlobal(
    "fetch",
    vi.fn().mockImplementation(async () => {
      return {
        ok: true,
        status: 200,
        headers: {
          get: (name: string) =>
            name.toLowerCase() === "content-type" ? "audio/wav" : null,
        },
        blob: async () => new Blob([new Uint8Array([1])]),
      } as Response;
    }),
  );
}

describe("active scorer latest-only commentary playback", () => {
  it("does not play stale ball 4 after scorer moves to 6", async () => {
    mockFetchOk();
    notifyLocalScoringDeliveryCommitted(1);
    enqueueDeliveryCommentaryReady({
      clientEventId: "seq-1-four",
      inningsId: "inn-1",
      sequenceInInnings: 1,
    });
    notifyLocalScoringDeliveryCommitted(2);
    enqueueDeliveryCommentaryReady({
      clientEventId: "seq-2-six",
      inningsId: "inn-1",
      sequenceInInnings: 2,
    });
    expect(commentaryQueueTestState().readySequences).toEqual([2]);
    expect(commentaryQueueTestState().staleSuperseded).toContain("seq-1-four");

    await drainCommentaryAudioQueueForTests();
    expect(playCallCount).toBe(1);
    expect(commentaryQueueTestState().playedClientEventIds).toEqual([
      "seq-2-six",
    ]);
  });

  it("suppresses pending backlog for 4 → 6 → 2 rapid scoring", async () => {
    mockFetchOk();
    notifyLocalScoringDeliveryCommitted(1);
    enqueueDeliveryCommentaryReady({
      clientEventId: "seq-1",
      inningsId: "inn-1",
      sequenceInInnings: 1,
    });
    notifyLocalScoringDeliveryCommitted(2);
    enqueueDeliveryCommentaryReady({
      clientEventId: "seq-2",
      inningsId: "inn-1",
      sequenceInInnings: 2,
    });
    notifyLocalScoringDeliveryCommitted(3);
    enqueueDeliveryCommentaryReady({
      clientEventId: "seq-3",
      inningsId: "inn-1",
      sequenceInInnings: 3,
    });

    await drainCommentaryAudioQueueForTests();
    expect(playCallCount).toBe(1);
    expect(commentaryQueueTestState().playedClientEventIds).toEqual(["seq-3"]);
  });

  it("plays wicket commentary without waiting behind stale balls", async () => {
    mockFetchOk();
    notifyLocalScoringDeliveryCommitted(1);
    enqueueDeliveryCommentaryReady({
      clientEventId: "seq-1",
      inningsId: "inn-1",
      sequenceInInnings: 1,
    });
    notifyLocalScoringDeliveryCommitted(2);
    enqueueDeliveryCommentaryReady({
      clientEventId: "seq-2",
      inningsId: "inn-1",
      sequenceInInnings: 2,
    });
    notifyLocalScoringDeliveryCommitted(3);
    enqueueDeliveryCommentaryReady({
      clientEventId: "seq-3-wicket",
      inningsId: "inn-1",
      sequenceInInnings: 3,
    });

    await drainCommentaryAudioQueueForTests();
    expect(playCallCount).toBe(1);
    expect(commentaryQueueTestState().playedClientEventIds).toEqual([
      "seq-3-wicket",
    ]);
  });

  it("ignores late-arriving ready metadata for a superseded delivery", async () => {
    mockFetchOk();
    notifyLocalScoringDeliveryCommitted(2);
    enqueueDeliveryCommentaryReady({
      clientEventId: "seq-2",
      inningsId: "inn-1",
      sequenceInInnings: 2,
    });
    enqueueDeliveryCommentaryReady({
      clientEventId: "seq-1-late",
      inningsId: "inn-1",
      sequenceInInnings: 1,
    });
    expect(commentaryQueueTestState().readySequences).toEqual([2]);

    await drainCommentaryAudioQueueForTests();
    expect(playCallCount).toBe(1);
    expect(commentaryQueueTestState().playedClientEventIds).toEqual(["seq-2"]);
  });

  it("does not invalidate audio that has already started playing", () => {
    notifyLocalScoringDeliveryCommitted(1);
    enqueueDeliveryCommentaryReady({
      clientEventId: "seq-1",
      inningsId: "inn-1",
      sequenceInInnings: 1,
    });
    setCurrentlyPlayingSequenceForTests(1);
    notifyLocalScoringDeliveryCommitted(2);
    enqueueDeliveryCommentaryReady({
      clientEventId: "seq-2",
      inningsId: "inn-1",
      sequenceInInnings: 2,
    });
    expect(commentaryQueueTestState().readySequences).toEqual([1, 2]);
    setCurrentlyPlayingSequenceForTests(null);
    notifyLocalScoringDeliveryCommitted(2);
    expect(commentaryQueueTestState().readySequences).toEqual([2]);
  });

});
