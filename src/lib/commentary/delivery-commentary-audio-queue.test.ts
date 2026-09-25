import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  commentaryQueueTestState,
  configureCommentaryPlaybackBaseline,
  drainCommentaryAudioQueueForTests,
  enqueueDeliveryCommentaryReady,
  notifyLocalScoringDeliveryCommitted,
  resetDeliveryCommentaryQueueForTests,
} from "@/lib/commentary/delivery-commentary-audio-queue";
import { resetCommentaryPlaybackBaselineForTests } from "@/lib/commentary/commentary-playback-session";

beforeEach(() => {
  resetDeliveryCommentaryQueueForTests();
  resetCommentaryPlaybackBaselineForTests();
  configureCommentaryPlaybackBaseline({ minSequenceInInnings: 1 });
  vi.stubGlobal("window", globalThis);
  vi.stubGlobal(
    "fetch",
    vi.fn().mockResolvedValue({ ok: false, status: 500, headers: { get: () => null } }),
  );
  vi.stubGlobal("URL", {
    createObjectURL: () => "blob:test",
    revokeObjectURL: () => {},
  });
  class MockAudio {
    preload = "";
    src = "";
    currentTime = 0;
    addEventListener() {}
    removeEventListener() {}
    pause() {}
    load() {}
    play() {
      return Promise.reject(new Error("autoplay blocked"));
    }
  }
  vi.stubGlobal("Audio", MockAudio);
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("delivery commentary audio queue", () => {
  it("dedupes ready events by client event id", () => {
    const item = {
      clientEventId: "11111111-1111-1111-1111-111111111111",
      inningsId: "22222222-2222-2222-2222-222222222222",
      sequenceInInnings: 1,
    };
    enqueueDeliveryCommentaryReady(item);
    enqueueDeliveryCommentaryReady(item);
    expect(commentaryQueueTestState().readySequences).toEqual([1]);
  });

  it("does not play later ball before earlier sequence is ready", () => {
    enqueueDeliveryCommentaryReady({
      clientEventId: "22222222-2222-2222-2222-222222222222",
      inningsId: "33333333-3333-3333-3333-333333333333",
      sequenceInInnings: 2,
    });
    const state = commentaryQueueTestState();
    expect(state.nextSequenceToPlay).toBe(1);
    expect(state.readySequences).toEqual([2]);
  });

  it("advances playhead when audio.play() fails so later balls are not stuck", async () => {
    vi.mocked(fetch).mockResolvedValueOnce({
      ok: true,
      status: 200,
      headers: {
        get: (name: string) =>
          name.toLowerCase() === "content-type" ? "audio/wav" : null,
      },
      blob: async () => new Blob([new Uint8Array([1, 2, 3])]),
    } as Response);
    enqueueDeliveryCommentaryReady({
      clientEventId: "11111111-1111-1111-1111-111111111111",
      inningsId: "22222222-2222-2222-2222-222222222222",
      sequenceInInnings: 1,
    });
    expect(commentaryQueueTestState().readySequences).toEqual([1]);
    await drainCommentaryAudioQueueForTests();
    expect(commentaryQueueTestState().nextSequenceToPlay).toBe(2);
  });

  it("realigns playhead when baseline jumped ahead of committed ball", () => {
    configureCommentaryPlaybackBaseline({ minSequenceInInnings: 11 });
    expect(commentaryQueueTestState().nextSequenceToPlay).toBe(11);
    notifyLocalScoringDeliveryCommitted(10);
    expect(commentaryQueueTestState().nextSequenceToPlay).toBe(10);
  });

  it("snaps playhead to committed ball when earlier sequences are not queued", () => {
    configureCommentaryPlaybackBaseline({
      minSequenceInInnings: 50,
      inningsId: "inn-2",
    });
    expect(commentaryQueueTestState().nextSequenceToPlay).toBe(50);
    notifyLocalScoringDeliveryCommitted(52);
    expect(commentaryQueueTestState().nextSequenceToPlay).toBe(52);
  });

  it("does not skip current ball when min sequence increases mid-innings", () => {
    configureCommentaryPlaybackBaseline({
      minSequenceInInnings: 10,
      inningsId: "inn-1",
    });
    expect(commentaryQueueTestState().nextSequenceToPlay).toBe(10);
    configureCommentaryPlaybackBaseline({
      minSequenceInInnings: 11,
      inningsId: "inn-1",
    });
    expect(commentaryQueueTestState().nextSequenceToPlay).toBe(10);
    enqueueDeliveryCommentaryReady({
      clientEventId: "11111111-1111-1111-1111-111111111111",
      inningsId: "inn-1",
      sequenceInInnings: 10,
    });
    expect(commentaryQueueTestState().readySequences).toEqual([10]);
  });
});
