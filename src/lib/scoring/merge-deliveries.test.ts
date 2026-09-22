import { describe, expect, it } from "vitest";
import { mergeDeliveries } from "@/lib/scoring/merge-deliveries";
import type { DeliveryInput } from "@/lib/scoring-engine/types";

function delivery(
  id: string,
  seq: number,
  runs: number,
): DeliveryInput {
  return {
    clientEventId: id,
    sequenceInInnings: seq,
    overNumber: 0,
    ballNumber: seq,
    strikerPlayerId: null,
    strikerName: "A",
    nonStrikerPlayerId: null,
    nonStrikerName: "B",
    bowlerPlayerId: null,
    bowlerName: "C",
    batterRuns: runs,
    totalRuns: runs,
    extrasRuns: 0,
    extraType: "none",
    isLegalDelivery: true,
    isBoundary: false,
    isSix: false,
    isWicket: false,
    wicketType: null,
    dismissedPlayerId: null,
    dismissedPlayerName: null,
    fielderPlayerId: null,
    fielderName: null,
    notes: null,
  };
}

describe("mergeDeliveries", () => {
  it("dedupes by clientEventId with local winning", () => {
    const server = [delivery("a", 1, 1)];
    const local = [delivery("a", 1, 4), delivery("b", 2, 2)];
    const merged = mergeDeliveries(server, local);
    expect(merged).toHaveLength(2);
    expect(merged.find((d) => d.clientEventId === "a")?.totalRuns).toBe(4);
  });

  it("sorts by sequence", () => {
    const merged = mergeDeliveries(
      [delivery("b", 2, 2)],
      [delivery("a", 1, 1)],
    );
    expect(merged.map((d) => d.clientEventId)).toEqual(["a", "b"]);
  });
});
