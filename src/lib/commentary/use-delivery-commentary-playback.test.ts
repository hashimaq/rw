import { describe, expect, it, vi } from "vitest";
import { handleReadyRowForTests } from "@/lib/commentary/use-delivery-commentary-playback";
import {
  commentaryQueueTestState,
  resetDeliveryCommentaryQueueForTests,
} from "@/lib/commentary/delivery-commentary-audio-queue";
import { resetCommentaryPlaybackBaselineForTests } from "@/lib/commentary/commentary-playback-session";

describe("useDeliveryCommentaryPlayback ready handling", () => {
  it("ignores duplicate ready rows for the same clientEventId", () => {
    resetDeliveryCommentaryQueueForTests();
    resetCommentaryPlaybackBaselineForTests();
    vi.stubGlobal("window", globalThis);

    const row = {
      client_event_id: "11111111-1111-1111-1111-111111111111",
      match_id: "22222222-2222-2222-2222-222222222222",
      innings_id: "33333333-3333-3333-3333-333333333333",
      sequence_in_innings: 1,
      status: "ready",
    };
    handleReadyRowForTests(row);
    handleReadyRowForTests(row);
    expect(commentaryQueueTestState().readySequences).toEqual([1]);

    vi.unstubAllGlobals();
  });
});
