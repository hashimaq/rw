import { describe, expect, it } from "vitest";
import {
  getCommentaryReadyMeta,
  markCommentaryReadyForController,
  resetCommentaryReadyNotifierForTests,
  waitForCommentaryReadySignal,
} from "@/lib/commentary/commentary-ready-notifier";

describe("commentary ready notifier", () => {
  it("resolves waiters when audio becomes ready", async () => {
    resetCommentaryReadyNotifierForTests();
    const wait = waitForCommentaryReadySignal(
      "11111111-1111-1111-1111-111111111111",
      500,
    );
    markCommentaryReadyForController({
      clientEventId: "11111111-1111-1111-1111-111111111111",
      matchId: "22222222-2222-2222-2222-222222222222",
      inningsId: "33333333-3333-3333-3333-333333333333",
      sequenceInInnings: 4,
    });
    const meta = await wait;
    expect(meta?.sequenceInInnings).toBe(4);
    expect(getCommentaryReadyMeta("11111111-1111-1111-1111-111111111111")).toBeTruthy();
  });
});
