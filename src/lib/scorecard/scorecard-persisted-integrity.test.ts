import { describe, expect, it } from "vitest";
import {
  inningsPersistedTotalsMismatchDeliveries,
  inningsScoredWithoutDeliveries,
  inningsTotalsSummary,
  persistedScorecardDataIncomplete,
} from "@/lib/scorecard/scorecard-persisted-integrity";
import type { Delivery, InningsRow } from "@/lib/database/types";

function delivery(
  partial: Partial<Delivery> & Pick<Delivery, "innings_id" | "total_runs">,
): Delivery {
  return {
    id: "d1",
    sequence_in_innings: 1,
    client_event_id: "11111111-1111-4111-8111-111111111111",
    over_number: 0,
    ball_number: 1,
    striker_player_id: null,
    striker_name: "A",
    non_striker_player_id: null,
    non_striker_name: "B",
    bowler_player_id: null,
    bowler_name: "C",
    batter_runs: partial.total_runs,
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

const inn = (n: number, runs: number, wkts: number): InningsRow => ({
  id: `inn-${n}`,
  match_id: "m",
  innings_number: n,
  batting_team: n === 1 ? "opponent" : "red_wings",
  bowling_team: n === 1 ? "red_wings" : "opponent",
  innings_status: "completed",
  target: null,
  overs_limit: 20,
  total_runs: runs,
  wickets: wkts,
  completed_at: null,
  created_at: "2026-01-01T00:00:00Z",
});

describe("inningsScoredWithoutDeliveries", () => {
  it("is true when innings have totals but delivery table is empty", () => {
    expect(inningsScoredWithoutDeliveries([inn(1, 47, 3), inn(2, 48, 1)], [])).toBe(
      true,
    );
  });

  it("is false when deliveries exist", () => {
    const d = { innings_id: "inn-1" } as Delivery;
    expect(inningsScoredWithoutDeliveries([inn(1, 47, 3)], [d])).toBe(false);
  });

  it("is false for genuinely empty not-started innings", () => {
    const empty: InningsRow = {
      ...inn(1, 0, 0),
      innings_status: "not_started",
    };
    expect(inningsScoredWithoutDeliveries([empty], [])).toBe(false);
  });
});

describe("inningsTotalsSummary", () => {
  it("maps persisted innings rows for display", () => {
    expect(inningsTotalsSummary([inn(1, 47, 3)])).toEqual([
      {
        inningsNumber: 1,
        battingTeam: "opponent",
        totalRuns: 47,
        wickets: 3,
      },
    ]);
  });
});

describe("inningsPersistedTotalsMismatchDeliveries", () => {
  it("detects partial sync (stored 48/1 vs delivery sum 38/1)", () => {
    const innings2 = inn(2, 48, 1);
    const rows = [
      delivery({ innings_id: innings2.id, total_runs: 4, batter_runs: 4 }),
      delivery({
        innings_id: innings2.id,
        total_runs: 34,
        batter_runs: 34,
        sequence_in_innings: 2,
        client_event_id: "22222222-2222-4222-8222-222222222222",
      }),
    ];
    expect(inningsPersistedTotalsMismatchDeliveries([innings2], rows)).toBe(
      true,
    );
  });

  it("is false when delivery-derived totals match stored summary", () => {
    const innings1 = inn(1, 47, 3);
    const rows = Array.from({ length: 47 }, (_, i) =>
      delivery({
        innings_id: innings1.id,
        total_runs: 1,
        batter_runs: 1,
        sequence_in_innings: i + 1,
        client_event_id: `00000000-0000-4000-8000-${String(i).padStart(12, "0")}`,
        is_wicket: i < 3,
      }),
    );
    expect(inningsPersistedTotalsMismatchDeliveries([innings1], rows)).toBe(
      false,
    );
  });
});

describe("persistedScorecardDataIncomplete", () => {
  it("combines empty-delivery and mismatch checks", () => {
    expect(
      persistedScorecardDataIncomplete([inn(1, 47, 3)], []),
    ).toBe(true);
    expect(
      persistedScorecardDataIncomplete(
        [inn(2, 48, 1)],
        [delivery({ innings_id: "inn-2", total_runs: 10 })],
      ),
    ).toBe(true);
  });
});
