import { describe, expect, it } from "vitest";
import { sortSyncQueueItems } from "@/lib/sync/sort-sync-queue";
import type { SyncQueueItem } from "@/lib/local-db/schema";

function item(
  inningsId: string,
  seq: number,
  created_at: string,
): SyncQueueItem {
  return {
    client_event_id: `00000000-0000-4000-8000-${String(seq).padStart(12, "0")}`,
    match_id: "match-1",
    innings_id: inningsId,
    payload: {
      client_event_id: `00000000-0000-4000-8000-${String(seq).padStart(12, "0")}`,
      innings_id: inningsId,
      sequence_in_innings: seq,
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
    created_at,
    updated_at: created_at,
  };
}

describe("sortSyncQueueItems", () => {
  it("orders by innings then sequence_in_innings, not created_at", () => {
    const sorted = sortSyncQueueItems([
      item("inn-2", 3, "2026-01-03T00:00:00Z"),
      item("inn-1", 2, "2026-01-02T00:00:00Z"),
      item("inn-1", 1, "2026-01-01T00:00:00Z"),
    ]);
    expect(sorted.map((s) => `${s.innings_id}:${s.payload.sequence_in_innings}`)).toEqual([
      "inn-1:1",
      "inn-1:2",
      "inn-2:3",
    ]);
  });
});
