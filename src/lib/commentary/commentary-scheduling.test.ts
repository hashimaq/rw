import { describe, expect, it } from "vitest";
import { shouldGenerateDeliveryCommentary } from "@/lib/commentary/should-generate-commentary";
import type { DeliveryInputPayload } from "@/lib/validation/delivery";

function basePayload(): DeliveryInputPayload {
  return {
    client_event_id: "11111111-1111-1111-1111-111111111111",
    innings_id: "22222222-2222-2222-2222-222222222222",
    sequence_in_innings: 6,
    over_number: 1,
    ball_number: 6,
    striker_player_id: null,
    striker_name: "Ali",
    non_striker_player_id: null,
    non_striker_name: "Hassan",
    bowler_player_id: null,
    bowler_name: "Amir",
    batter_runs: 0,
    total_runs: 0,
    extras_runs: 0,
    extra_type: "none",
    is_legal_delivery: true,
    is_boundary: false,
    is_six: false,
    is_wicket: true,
    wicket_type: "bowled",
    dismissed_player_id: null,
    dismissed_player_name: "Ali",
    fielder_player_id: null,
    fielder_name: null,
    notes: null,
  };
}

describe("commentary scheduling eligibility", () => {
  it("schedules for real wicket delivery", () => {
    expect(shouldGenerateDeliveryCommentary(basePayload())).toBe(true);
  });

  it("does not schedule for crease correction", () => {
    const p = basePayload();
    p.notes = "crease_correction";
    p.is_wicket = false;
    p.wicket_type = null;
    expect(shouldGenerateDeliveryCommentary(p)).toBe(false);
  });

  it("does not schedule for dead ball meta", () => {
    const p = basePayload();
    p.notes = "dead_ball";
    expect(shouldGenerateDeliveryCommentary(p)).toBe(false);
  });
});
