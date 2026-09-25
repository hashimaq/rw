import { describe, expect, it } from "vitest";
import { dedupeSyncQueueBySequence } from "@/lib/sync/dedupe-sync-queue-by-sequence";
import type { SyncQueueItem } from "@/lib/local-db/schema";

const INN = "22222222-2222-4222-8222-222222222222";

function item(
  clientEventId: string,
  sequence: number,
  createdAt: string,
): SyncQueueItem {
  return {
    client_event_id: clientEventId,
    match_id: "11111111-1111-4111-8111-111111111111",
    innings_id: INN,
    payload: {
      client_event_id: clientEventId,
      innings_id: INN,
      sequence_in_innings: sequence,
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
    },
    status: "pending",
    attempts: 0,
    last_error: null,
    created_at: createdAt,
    updated_at: createdAt,
  };
}

describe("dedupeSyncQueueBySequence", () => {
  it("keeps the later queue row for the same sequence", () => {
    const a = item("aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa", 5, "2020-01-01T00:00:00Z");
    const b = item("bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb", 5, "2020-01-02T00:00:00Z");
    const out = dedupeSyncQueueBySequence([a, b]);
    expect(out).toHaveLength(1);
    expect(out[0]?.client_event_id).toBe(b.client_event_id);
  });
});
