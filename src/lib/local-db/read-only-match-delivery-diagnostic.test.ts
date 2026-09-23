import { describe, expect, it } from "vitest";
import {
  buildInningsBreakdown,
  summarizeLocalDeliveries,
  summarizeSyncQueue,
} from "@/lib/local-db/read-only-match-delivery-diagnostic";
import type {
  LocalDeliveryRecord,
  SyncQueueItem,
} from "@/lib/local-db/schema";

const inningsOrder = [
  { id: "inn-1", label: "Innings 1" },
  { id: "inn-2", label: "Innings 2" },
];

function delivery(
  partial: Partial<LocalDeliveryRecord> & Pick<LocalDeliveryRecord, "innings_id">,
): LocalDeliveryRecord {
  const { innings_id, ...rest } = partial;
  return {
    client_event_id: "aaaaaaaa-bbbb-4ccc-8ddd-000000000001",
    innings_id,
    sequence_in_innings: 1,
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
    match_id: "match-1",
    synced: false,
    created_at: "2026-01-01T00:00:00Z",
    ...rest,
  };
}

describe("read-only local delivery diagnostic summaries", () => {
  it("groups deliveries and sync queue by innings label", () => {
    const del = summarizeLocalDeliveries(
      [
        delivery({ innings_id: "inn-1" }),
        delivery({
          innings_id: "inn-2",
          client_event_id: "aaaaaaaa-bbbb-4ccc-8ddd-000000000002",
        }),
      ],
      inningsOrder,
    );
    expect(del.total).toBe(2);
    expect(del.byInningsLabel).toEqual([
      { label: "Innings 1", inningsId: "inn-1", count: 1 },
      { label: "Innings 2", inningsId: "inn-2", count: 1 },
    ]);
    expect(del.withClientEventId).toBe(2);
    expect(del.hasScoringFields).toBe(true);

    const queue: SyncQueueItem[] = [
      {
        client_event_id: "aaaaaaaa-bbbb-4ccc-8ddd-000000000003",
        match_id: "match-1",
        innings_id: "inn-1",
        payload: delivery({ innings_id: "inn-1" }),
        status: "pending",
        attempts: 0,
        last_error: null,
        created_at: "2026-01-01T00:00:00Z",
        updated_at: "2026-01-01T00:00:00Z",
      },
    ];
    const sync = summarizeSyncQueue(queue, inningsOrder);
    expect(sync.pendingTotal).toBe(1);
    expect(sync.pendingByInningsLabel[0]?.count).toBe(1);
  });

  it("labels unknown innings ids when bootstrap order is missing", () => {
    const rows = buildInningsBreakdown({ "other-inn": 3 }, []);
    expect(rows[0]?.count).toBe(3);
    expect(rows[0]?.label).toContain("Unknown innings");
  });
});
