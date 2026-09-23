import { describe, expect, it } from "vitest";
import {
  buildLocalOnlyDetails,
  classifySyncFailureReason,
  compareDeliveriesByClientEventId,
} from "@/lib/local-db/local-server-delivery-compare";
import type {
  LocalDeliveryRecord,
  SyncQueueItem,
} from "@/lib/local-db/schema";

function localDelivery(
  client_event_id: string,
  sequence_in_innings: number,
): LocalDeliveryRecord {
  return {
    client_event_id,
    innings_id: "inn-2",
    sequence_in_innings,
    over_number: 0,
    ball_number: 1,
    striker_name: "A",
    non_striker_name: "B",
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
    match_id: "m1",
    synced: false,
    created_at: "2026-01-01T00:00:00Z",
  };
}

describe("compareDeliveriesByClientEventId", () => {
  it("finds local-only and server-only ids", () => {
    const local = [
      localDelivery("11111111-1111-4111-8111-111111111111", 1),
      localDelivery("22222222-2222-4222-8222-222222222222", 2),
    ];
    const server = [
      {
        client_event_id: "11111111-1111-4111-8111-111111111111",
        sequence_in_innings: 1,
      },
      {
        client_event_id: "33333333-3333-4333-8333-333333333333",
        sequence_in_innings: 3,
      },
    ];
    const r = compareDeliveriesByClientEventId(local, server);
    expect(r.localCount).toBe(2);
    expect(r.serverCount).toBe(2);
    expect(r.localOnlyClientEventIds).toEqual([
      "22222222-2222-4222-8222-222222222222",
    ]);
    expect(r.serverOnlyClientEventIds).toEqual([
      "33333333-3333-4333-8333-333333333333",
    ]);
  });
});

describe("classifySyncFailureReason", () => {
  it("classifies FK and session errors", () => {
    expect(classifySyncFailureReason("23503 striker_player_id_fkey")).toBe(
      "fk_23503",
    );
    expect(classifySyncFailureReason("session_invalid")).toBe(
      "session_invalid",
    );
  });
});

describe("buildLocalOnlyDetails", () => {
  it("joins sync queue metadata", () => {
    const id = "22222222-2222-4222-8222-222222222222";
    const d = localDelivery(id, 6);
    const queue: SyncQueueItem = {
      client_event_id: id,
      match_id: "m1",
      innings_id: "inn-2",
      payload: d,
      status: "failed",
      attempts: 3,
      last_error: "23503",
      created_at: "2026-01-01T00:00:00Z",
      updated_at: "2026-01-01T00:00:00Z",
    };
    const details = buildLocalOnlyDetails([d], [id], [queue]);
    expect(details[0]?.sequence_in_innings).toBe(6);
    expect(details[0]?.syncQueue?.status).toBe("failed");
  });
});
