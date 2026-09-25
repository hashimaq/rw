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
import { payloadToDeliveryInput } from "@/lib/mappers/delivery";
import { deliveryInputToPayload } from "@/lib/mappers/delivery";
import {
  buildInningsStateBeforeIncomingDelivery,
  validateIncomingDeliveryAgainstState,
} from "@/lib/scoring/validate-incoming-delivery";
import type { Delivery } from "@/lib/database/types";

const C = "33333333-3333-4333-8333-333333333333";
const D = "44444444-4444-4444-8444-444444444444";
const E = "55555555-5555-4555-8555-555555555555";

const P: ActiveParticipants = {
  strikerPlayerId: "11111111-1111-4111-8111-111111111111",
  strikerName: "A",
  nonStrikerPlayerId: "22222222-2222-4222-8222-222222222222",
  nonStrikerName: "B",
  bowlerPlayerId: C,
  bowlerName: "BowlerX",
};

function rowFromInput(
  inningsId: string,
  input: ReturnType<typeof payloadToDeliveryInput>,
): Delivery {
  const p = deliveryInputToPayload(inningsId, input);
  return {
    id: input.clientEventId,
    client_event_id: input.clientEventId,
    innings_id: inningsId,
    sequence_in_innings: p.sequence_in_innings,
    over_number: p.over_number,
    ball_number: p.ball_number,
    striker_player_id: p.striker_player_id ?? null,
    striker_name: p.striker_name,
    non_striker_player_id: p.non_striker_player_id ?? null,
    non_striker_name: p.non_striker_name,
    bowler_player_id: p.bowler_player_id ?? null,
    bowler_name: p.bowler_name,
    batter_runs: p.batter_runs,
    total_runs: p.total_runs,
    extras_runs: p.extras_runs,
    extra_type: p.extra_type,
    is_legal_delivery: p.is_legal_delivery,
    is_boundary: p.is_boundary,
    is_six: p.is_six,
    is_wicket: p.is_wicket,
    wicket_type: p.wicket_type,
    dismissed_player_id: p.dismissed_player_id ?? null,
    dismissed_player_name: p.dismissed_player_name ?? null,
    fielder_player_id: p.fielder_player_id ?? null,
    fielder_name: p.fielder_name ?? null,
    notes: p.notes ?? null,
    created_at: new Date().toISOString(),
  };
}

describe("validateIncomingDeliveryAgainstState", () => {
  it("allows crease correction with previous over bowler at new over", () => {
    let s = createEmptyInningsState(20);
    for (let i = 0; i < 6; i += 1) {
      s = applyDeliveryToState(
        s,
        buildNormalRunDelivery(s, P, `d-${i}`, 0),
      );
    }
    const inningsId = "22222222-2222-4222-8222-222222222222";
    const existing = s.deliveries.map((d) => rowFromInput(inningsId, d));
    const crease = buildCreaseCorrectionDelivery(
      s,
      {
        ...P,
        strikerPlayerId: E,
        strikerName: "Replacement",
      },
      "crease-1",
    );
    const incoming = payloadToDeliveryInput(
      deliveryInputToPayload(inningsId, crease),
    );
    const stateBefore = buildInningsStateBeforeIncomingDelivery(
      existing,
      20,
      null,
      incoming.clientEventId,
      incoming.sequenceInInnings,
    );
    expect(
      validateIncomingDeliveryAgainstState(stateBefore, incoming),
    ).toBeNull();
  });

  it("rejects real ball with same bowler at new over", () => {
    let s = createEmptyInningsState(20);
    for (let i = 0; i < 6; i += 1) {
      s = applyDeliveryToState(
        s,
        buildNormalRunDelivery(s, P, `d-${i}`, 0),
      );
    }
    const ball = buildNormalRunDelivery(s, P, "d-7", 1);
    const incoming = ball;
    expect(
      validateIncomingDeliveryAgainstState(s, incoming),
    ).toMatch(/consecutive/i);
  });
});
