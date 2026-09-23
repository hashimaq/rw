import { describe, expect, it } from "vitest";
import {
  createOpponentParticipant,
  opponentParticipantsFromDeliveries,
} from "@/lib/scoring/opponent-participant";
import {
  applyDeliveryToState,
  createEmptyInningsState,
} from "@/lib/scoring-engine/build-state";
import {
  buildNormalRunDelivery,
  type ActiveParticipants,
} from "@/lib/scoring-engine/delivery-builders";

describe("opponent participant identity", () => {
  it("assigns unique player ids for new name-only opponents", () => {
    const a = createOpponentParticipant("Umair");
    const b = createOpponentParticipant("Umair");
    expect(a.name).toBe(b.name);
    expect(a.playerId).not.toBe(b.playerId);
  });

  it("derives stable ids from deliveries for reload", () => {
    const id1 = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
    const id2 = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";
    const P1: ActiveParticipants = {
      strikerPlayerId: id1,
      strikerName: "Umair",
      nonStrikerPlayerId: id2,
      nonStrikerName: "Umair",
      bowlerPlayerId: null,
      bowlerName: "Bowler",
    };
    let s = createEmptyInningsState(20);
    s = applyDeliveryToState(
      s,
      buildNormalRunDelivery(s, P1, "delivery-1", 1),
    );
    const refs = opponentParticipantsFromDeliveries(s.deliveries);
    expect(refs).toHaveLength(2);
    expect(new Set(refs.map((r) => r.playerId)).size).toBe(2);
  });
});
