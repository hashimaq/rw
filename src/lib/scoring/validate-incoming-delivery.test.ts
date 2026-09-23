import { describe, expect, it } from "vitest";
import type { Delivery } from "@/lib/database/types";
import { buildInningsStateBeforeIncomingDelivery } from "@/lib/scoring/validate-incoming-delivery";

function row(
  partial: Partial<Delivery> &
    Pick<Delivery, "client_event_id" | "sequence_in_innings">,
): Delivery {
  return {
    id: partial.client_event_id,
    innings_id: "inn-1",
    over_number: 0,
    ball_number: 1,
    striker_player_id: null,
    striker_name: "A",
    non_striker_player_id: null,
    non_striker_name: "B",
    bowler_player_id: null,
    bowler_name: "C",
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
    created_at: "2026-01-01T00:00:00Z",
    ...partial,
  } as Delivery;
}

describe("buildInningsStateBeforeIncomingDelivery", () => {
  it("uses only deliveries before incoming sequence (gap backfill)", () => {
    const existing = [
      row({ client_event_id: "a", sequence_in_innings: 1, total_runs: 1 }),
      row({ client_event_id: "b", sequence_in_innings: 2, total_runs: 1 }),
      row({
        client_event_id: "d",
        sequence_in_innings: 4,
        total_runs: 4,
        batter_runs: 4,
      }),
    ];
    const state = buildInningsStateBeforeIncomingDelivery(
      existing,
      20,
      null,
      "incoming-6",
      3,
    );
    expect(state.totalRuns).toBe(2);
    expect(state.deliveries).toHaveLength(2);
  });

  it("live append still includes all prior deliveries", () => {
    const existing = [
      row({ client_event_id: "a", sequence_in_innings: 1 }),
      row({ client_event_id: "b", sequence_in_innings: 2 }),
    ];
    const state = buildInningsStateBeforeIncomingDelivery(
      existing,
      20,
      null,
      "c",
      3,
    );
    expect(state.deliveries).toHaveLength(2);
  });
});
