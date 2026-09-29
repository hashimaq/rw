import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  controllerCommentaryWatchInFlightForTests,
  startControllerCommentaryFastPath,
} from "@/lib/commentary/controller-commentary-fast-path";
import {
  commentaryQueueTestState,
  resetDeliveryCommentaryQueueForTests,
} from "@/lib/commentary/delivery-commentary-audio-queue";
import { resetCommentaryPlaybackBaselineForTests } from "@/lib/commentary/commentary-playback-session";
import type { DeliveryInputPayload } from "@/lib/validation/delivery";

const enqueueSpy = vi.fn();

vi.mock("@/lib/commentary/delivery-commentary-audio-queue", async (importOriginal) => {
  const original =
    await importOriginal<
      typeof import("@/lib/commentary/delivery-commentary-audio-queue")
    >();
  return {
    ...original,
    enqueueCommentaryForPlayback: (
      ...args: Parameters<typeof original.enqueueCommentaryForPlayback>
    ) => {
      enqueueSpy(...args);
      return original.enqueueCommentaryForPlayback(...args);
    },
    enqueueDeliveryCommentaryReady: (
      ...args: Parameters<typeof original.enqueueCommentaryForPlayback>
    ) => original.enqueueCommentaryForPlayback(...args),
  };
});

function payload(): DeliveryInputPayload {
  return {
    client_event_id: "11111111-1111-1111-1111-111111111111",
    innings_id: "22222222-2222-2222-2222-222222222222",
    sequence_in_innings: 1,
    over_number: 1,
    ball_number: 1,
    striker_player_id: null,
    striker_name: "Ali",
    non_striker_player_id: null,
    non_striker_name: "Hassan",
    bowler_player_id: null,
    bowler_name: "Amir",
    batter_runs: 1,
    total_runs: 1,
    extras_runs: 0,
    extra_type: "none",
    is_legal_delivery: true,
    is_boundary: false,
    is_six: false,
    is_wicket: false,
    wicket_type: null,
    dismissed_player_id: null,
    dismissed_player_name: null,
    fielder_player_id: null,
    fielder_name: null,
    notes: null,
  };
}

beforeEach(() => {
  resetDeliveryCommentaryQueueForTests();
  resetCommentaryPlaybackBaselineForTests();
  controllerCommentaryWatchInFlightForTests().clear();
  enqueueSpy.mockClear();
  vi.stubGlobal("window", globalThis);
  class MockAudio {
    preload = "";
    src = "";
    currentTime = 0;
    addEventListener() {}
    removeEventListener() {}
    pause() {}
    play() {
      return Promise.resolve();
    }
  }
  vi.stubGlobal("Audio", MockAudio);
  vi.stubGlobal(
    "fetch",
    vi.fn().mockResolvedValue({ ok: false, status: 500, headers: { get: () => null } }),
  );
  vi.stubGlobal("URL", {
    createObjectURL: () => "blob:test",
    revokeObjectURL: () => {},
  });
  vi.useFakeTimers();
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.useRealTimers();
});

describe("controller commentary fast path", () => {
  it("enqueues once when wait-ready returns ready", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockImplementation(async (input: RequestInfo) => {
        const url = String(input);
        if (url.includes("/schedule")) {
          return {
            ok: true,
            json: async () => ({ ok: true, scheduled: true }),
          };
        }
        return {
          ok: true,
          json: async () => ({
            ready: true,
            status: "ready",
            innings_id: payload().innings_id,
            sequence_in_innings: 1,
          }),
        };
      }),
    );

    startControllerCommentaryFastPath({ payload: payload() });
    await vi.waitFor(() => expect(enqueueSpy).toHaveBeenCalledTimes(1));
    expect(commentaryQueueTestState().readySequences).toEqual([1]);
  });

  it("does not start duplicate watches for the same clientEventId", () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ ok: true, scheduled: true }),
      }),
    );
    const p = payload();
    startControllerCommentaryFastPath({ payload: p });
    startControllerCommentaryFastPath({ payload: p });
    expect(controllerCommentaryWatchInFlightForTests().size).toBe(1);
  });
});
