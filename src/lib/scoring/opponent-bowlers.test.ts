import { describe, expect, it } from "vitest";
import {
  applyDeliveryToState,
  createEmptyInningsState,
} from "@/lib/scoring-engine/build-state";
import {
  buildCreaseCorrectionDelivery,
  buildNormalRunDelivery,
  type ActiveParticipants,
} from "@/lib/scoring-engine/delivery-builders";
import { participantKey } from "@/lib/scoring-engine/utils";
import { validateConsecutiveOverBowler } from "@/lib/scoring/bowler-consecutive-overs";
import { opponentBowlersFromDeliveries } from "@/lib/scoring/opponent-bowlers";
import { validateIncomingDeliveryAgainstState } from "@/lib/scoring/validate-incoming-delivery";

const A = "11111111-1111-4111-8111-111111111111";
const B = "22222222-2222-4222-8222-222222222222";

function over(state: ReturnType<typeof createEmptyInningsState>, P: ActiveParticipants, tag: string) {
  let s = state;
  for (let i = 0; i < 6; i += 1) {
    s = applyDeliveryToState(
      s,
      buildNormalRunDelivery(s, P, `${tag}-${i}`, 0),
    );
  }
  return s;
}

describe("opponent bowler history & rotation", () => {
  it("lists unique bowlers from legal deliveries", () => {
    const ali: ActiveParticipants = {
      strikerPlayerId: A,
      strikerName: "A",
      nonStrikerPlayerId: B,
      nonStrikerName: "B",
      bowlerPlayerId: null,
      bowlerName: "Ali",
    };
    const ahmed = { ...ali, bowlerName: "Ahmed" };
    let s = createEmptyInningsState(20);
    s = over(s, ali, "o1");
    s = over(s, ahmed, "o2");
    s = over(s, ali, "o3");
    const bilal = { ...ali, bowlerName: "Bilal" };
    s = over(s, bilal, "o4");

    const list = opponentBowlersFromDeliveries(s.deliveries);
    expect(list.map((b) => b.name).sort()).toEqual(["Ahmed", "Ali", "Bilal"]);
  });

  it("Over 1 Ali, Over 2 Ahmed — Ahmed disabled at next selection", () => {
    const ali: ActiveParticipants = {
      strikerPlayerId: A,
      strikerName: "A",
      nonStrikerPlayerId: B,
      nonStrikerName: "B",
      bowlerPlayerId: null,
      bowlerName: "Ali",
    };
    const ahmed = { ...ali, bowlerName: "Ahmed" };
    let s = over(createEmptyInningsState(20), ali, "o1");
    s = over(s, ahmed, "o2");
    expect(validateConsecutiveOverBowler(s, null, "Ahmed")).toMatch(
      /consecutive/i,
    );
    expect(validateConsecutiveOverBowler(s, null, "Ali")).toBeNull();
  });

  it("Over 3 Ali — Ali disabled, Ahmed available", () => {
    const ali: ActiveParticipants = {
      strikerPlayerId: A,
      strikerName: "A",
      nonStrikerPlayerId: B,
      nonStrikerName: "B",
      bowlerPlayerId: null,
      bowlerName: "Ali",
    };
    const ahmed = { ...ali, bowlerName: "Ahmed" };
    let s = over(createEmptyInningsState(20), ali, "o1");
    s = over(s, ahmed, "o2");
    s = over(s, ali, "o3");
    expect(validateConsecutiveOverBowler(s, null, "Ali")).toMatch(
      /consecutive/i,
    );
    expect(validateConsecutiveOverBowler(s, null, "Ahmed")).toBeNull();
  });

  it("server allows consecutive-over bowler on crease correction sync", () => {
    const ali: ActiveParticipants = {
      strikerPlayerId: A,
      strikerName: "A",
      nonStrikerPlayerId: B,
      nonStrikerName: "B",
      bowlerPlayerId: null,
      bowlerName: "Ali",
    };
    let s = over(createEmptyInningsState(20), ali, "o1");
    const incoming = buildCreaseCorrectionDelivery(s, ali, "pick-same");
    const err = validateIncomingDeliveryAgainstState(s, incoming);
    expect(err).toBeNull();
  });

  it("Usman via crease correction then next delivery uses Usman", () => {
    const ali: ActiveParticipants = {
      strikerPlayerId: A,
      strikerName: "A",
      nonStrikerPlayerId: B,
      nonStrikerName: "B",
      bowlerPlayerId: null,
      bowlerName: "Ali",
    };
    let s = over(createEmptyInningsState(20), ali, "o1");
    const usman = { ...ali, bowlerName: "Usman" };
    s = applyDeliveryToState(
      s,
      buildCreaseCorrectionDelivery(s, usman, "pick-usman"),
    );
    expect(s.currentBowlerKey).toBe(participantKey(null, "Usman"));
    s = applyDeliveryToState(
      s,
      buildNormalRunDelivery(s, usman, "ball-1", 0),
    );
    expect(s.deliveries.at(-1)?.bowlerName).toBe("Usman");
  });
});
