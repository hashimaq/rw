import { describe, expect, it } from "vitest";
import { sanitizeDeliveryPlayerIds } from "@/lib/scoring/sanitize-delivery-player-ids";
import type { DeliveryInputPayload } from "@/lib/validation/delivery";

const RW1 = "11111111-1111-4111-8111-111111111111";
const RW2 = "22222222-2222-4222-8222-222222222222";
const FAKE_OPP = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const CLIENT_EVENT = "33333333-3333-4333-8333-333333333333";
const INNINGS = "44444444-4444-4444-8444-444444444444";

function fullPayload(
  overrides: Partial<DeliveryInputPayload> = {},
): DeliveryInputPayload {
  return {
    client_event_id: CLIENT_EVENT,
    innings_id: INNINGS,
    sequence_in_innings: 7,
    over_number: 2,
    ball_number: 3,
    striker_player_id: RW1,
    striker_name: "Real Player",
    non_striker_player_id: RW2,
    non_striker_name: "Other RW",
    bowler_player_id: RW1,
    bowler_name: "Bowler One",
    batter_runs: 4,
    total_runs: 4,
    extras_runs: 0,
    extra_type: "none",
    is_legal_delivery: true,
    is_boundary: true,
    is_six: false,
    is_wicket: false,
    wicket_type: null,
    dismissed_player_id: null,
    dismissed_player_name: null,
    fielder_player_id: null,
    fielder_name: null,
    notes: null,
    ...overrides,
  };
}

const matchPool = new Set([RW1, RW2]);

describe("sanitizeDeliveryPlayerIds", () => {
  it("Test 1 — preserves valid public.players / match-pool striker ID", () => {
    const input = fullPayload({
      striker_player_id: RW1,
      striker_name: "Real Player",
    });
    const out = sanitizeDeliveryPlayerIds(input, matchPool);
    expect(out.striker_player_id).toBe(RW1);
    expect(out.striker_name).toBe("Real Player");
  });

  it("Test 2 — nulls synthetic opponent striker ID, keeps name", () => {
    const input = fullPayload({
      striker_player_id: FAKE_OPP,
      striker_name: "Opponent Batter",
    });
    const out = sanitizeDeliveryPlayerIds(input, matchPool);
    expect(out.striker_player_id).toBeNull();
    expect(out.striker_name).toBe("Opponent Batter");
  });

  it("Test 3 — sanitizes each participant field independently", () => {
    const input = fullPayload({
      striker_player_id: RW1,
      non_striker_player_id: FAKE_OPP,
      non_striker_name: "Opp NS",
      bowler_player_id: RW2,
      is_wicket: true,
      wicket_type: "caught",
      dismissed_player_id: FAKE_OPP,
      dismissed_player_name: "Out Opp",
      fielder_player_id: RW1,
      fielder_name: "Catcher",
    });
    const out = sanitizeDeliveryPlayerIds(input, matchPool);
    expect(out.striker_player_id).toBe(RW1);
    expect(out.non_striker_player_id).toBeNull();
    expect(out.non_striker_name).toBe("Opp NS");
    expect(out.bowler_player_id).toBe(RW2);
    expect(out.dismissed_player_id).toBeNull();
    expect(out.dismissed_player_name).toBe("Out Opp");
    expect(out.fielder_player_id).toBe(RW1);
  });

  it("Test 4 — leaves existing null IDs null; names unchanged", () => {
    const input = fullPayload({
      striker_player_id: null,
      non_striker_player_id: undefined,
      bowler_player_id: null,
      dismissed_player_id: null,
      fielder_player_id: null,
    });
    const out = sanitizeDeliveryPlayerIds(input, matchPool);
    expect(out.striker_player_id).toBeNull();
    expect(out.non_striker_player_id).toBeNull();
    expect(out.bowler_player_id).toBeNull();
    expect(out.striker_name).toBe("Real Player");
    expect(out.bowler_name).toBe("Bowler One");
  });

  it("Test 5 — client_event_id unchanged", () => {
    const out = sanitizeDeliveryPlayerIds(fullPayload(), matchPool);
    expect(out.client_event_id).toBe(CLIENT_EVENT);
  });

  it("Test 6 — does not alter scoring fields, only FK player IDs", () => {
    const input = fullPayload({
      striker_player_id: FAKE_OPP,
      extra_type: "bye",
      extras_runs: 1,
      total_runs: 2,
      batter_runs: 1,
      is_wicket: true,
      wicket_type: "bowled",
      sequence_in_innings: 12,
      innings_id: INNINGS,
      bowler_name: "Opp Bowl",
    });
    const out = sanitizeDeliveryPlayerIds(input, matchPool);
    expect(out.striker_player_id).toBeNull();
    expect(out.batter_runs).toBe(1);
    expect(out.total_runs).toBe(2);
    expect(out.extras_runs).toBe(1);
    expect(out.extra_type).toBe("bye");
    expect(out.is_wicket).toBe(true);
    expect(out.wicket_type).toBe("bowled");
    expect(out.sequence_in_innings).toBe(12);
    expect(out.innings_id).toBe(INNINGS);
    expect(out.bowler_name).toBe("Opp Bowl");
    expect(out.striker_name).toBe("Real Player");
  });

  it("Test 7 — all match-pool Red Wings IDs retained (no XI cap)", () => {
    const bench = "55555555-5555-4555-8555-555555555555";
    const pool = new Set([RW1, RW2, bench]);
    const input = fullPayload({
      striker_player_id: bench,
      non_striker_player_id: RW2,
      bowler_player_id: RW1,
    });
    const out = sanitizeDeliveryPlayerIds(input, pool);
    expect(out.striker_player_id).toBe(bench);
    expect(out.non_striker_player_id).toBe(RW2);
    expect(out.bowler_player_id).toBe(RW1);
  });
});
