import { beforeEach, describe, expect, it, vi } from "vitest";
import type { DeliveryInputPayload } from "@/lib/validation/delivery";

const synthesizeCalls: string[] = [];

vi.mock("@/lib/ai/gemini/config", () => ({
  isGeminiConfigured: () => true,
}));

vi.mock("@/lib/commentary/delivery-commentary-context", () => ({
  buildDeliveryCommentaryContext: (matchId: string, payload: DeliveryInputPayload) => ({
    clientEventId: payload.client_event_id,
    matchId,
    inningsId: payload.innings_id,
    sequenceInInnings: payload.sequence_in_innings,
  }),
}));

vi.mock("@/lib/commentary/gemini-delivery-commentary-text", () => ({
  generateDeliveryCommentaryText: vi.fn(async () => ({ text: "test" })),
}));

vi.mock("@/lib/commentary/delivery-commentary-tts", () => ({
  synthesizeDeliveryCommentarySpeech: vi.fn(async () => {
    synthesizeCalls.push("tts");
    return { buffer: Buffer.from("audio"), mimeType: "audio/mpeg", model: "test" };
  }),
}));

vi.mock("@/lib/commentary/commentary-audio-ephemeral-cache", () => ({
  putCommentaryAudioInEphemeralCache: vi.fn(),
}));

type CommentaryRow = {
  client_event_id: string;
  match_id: string;
  innings_id: string;
  sequence_in_innings: number;
  status: string;
};

function createMockSupabase() {
  const rows = new Map<string, CommentaryRow>();

  return {
    rows,
    client: {
      from(table: string) {
        if (table !== "delivery_commentary") {
          throw new Error(`unexpected table ${table}`);
        }
        return {
          upsert(
            row: CommentaryRow,
            options: { onConflict: string; ignoreDuplicates: boolean },
          ) {
            const existing = rows.get(row.client_event_id);
            if (existing && options.ignoreDuplicates) {
              return {
                select: () => ({
                  maybeSingle: async () => ({ data: null, error: null }),
                }),
              };
            }
            rows.set(row.client_event_id, { ...row });
            return {
              select: () => ({
                maybeSingle: async () => ({
                  data: { client_event_id: row.client_event_id },
                  error: null,
                }),
              }),
            };
          },
          update(patch: Partial<CommentaryRow> & Record<string, unknown>) {
            const claim = patch.status === "processing";
            if (claim) {
              return {
                eq(_col: string, clientEventId: string) {
                  return {
                    in(_statusCol: string, statuses: string[]) {
                      return {
                        select: () => ({
                          maybeSingle: async () => {
                            const row = rows.get(clientEventId);
                            if (!row || !statuses.includes(row.status)) {
                              return { data: null, error: null };
                            }
                            row.status = "processing";
                            return {
                              data: { client_event_id: clientEventId },
                              error: null,
                            };
                          },
                        }),
                      };
                    },
                  };
                },
              };
            }
            const row = rows.get(
              (patch as { client_event_id?: string }).client_event_id ?? "",
            );
            return {
              eq: (_col: string, clientEventId: string) => {
                const target = rows.get(clientEventId);
                if (target) Object.assign(target, patch);
                return Promise.resolve({ error: null });
              },
            };
          },
        };
      },
      storage: {
        from: () => ({
          upload: async () => ({ error: null }),
        }),
      },
    },
  };
}

let mockSupabase = createMockSupabase();

vi.mock("@/lib/supabase/admin", () => ({
  createServiceRoleClient: () => mockSupabase.client,
}));

function payload(): DeliveryInputPayload {
  return {
    client_event_id: "11111111-1111-1111-1111-111111111111",
    innings_id: "22222222-2222-2222-2222-222222222222",
    sequence_in_innings: 3,
    over_number: 1,
    ball_number: 3,
    striker_player_id: null,
    striker_name: "Ali",
    non_striker_player_id: null,
    non_striker_name: "Hassan",
    bowler_player_id: null,
    bowler_name: "Amir",
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
  };
}

beforeEach(() => {
  synthesizeCalls.length = 0;
  mockSupabase = createMockSupabase();
});

describe("scheduleDeliveryCommentaryForDelivery idempotency", () => {
  it("runs one TTS job for two concurrent schedule calls with the same clientEventId", async () => {
    const { scheduleDeliveryCommentaryForDelivery } = await import(
      "@/lib/commentary/run-delivery-commentary"
    );
    const options = {
      matchId: "33333333-3333-3333-3333-333333333333",
      payload: payload(),
      existingRows: [],
      oversLimit: 20,
      target: null as number | null,
    };
    await Promise.all([
      scheduleDeliveryCommentaryForDelivery(options),
      scheduleDeliveryCommentaryForDelivery(options),
    ]);
    expect(synthesizeCalls).toHaveLength(1);
    expect(mockSupabase.rows.size).toBe(1);
  });

  it("runs one TTS job when schedule is called again after the row exists", async () => {
    const { scheduleDeliveryCommentaryForDelivery } = await import(
      "@/lib/commentary/run-delivery-commentary"
    );
    const options = {
      matchId: "33333333-3333-3333-3333-333333333333",
      payload: payload(),
      existingRows: [],
      oversLimit: 20,
      target: null as number | null,
    };
    await scheduleDeliveryCommentaryForDelivery(options);
    await scheduleDeliveryCommentaryForDelivery(options);
    expect(synthesizeCalls).toHaveLength(1);
  });

  it("simulates controller schedule plus delivery API schedule as one TTS job", async () => {
    const { scheduleDeliveryCommentaryForDelivery } = await import(
      "@/lib/commentary/run-delivery-commentary"
    );
    const options = {
      matchId: "33333333-3333-3333-3333-333333333333",
      payload: payload(),
      existingRows: [],
      oversLimit: 20,
      target: null as number | null,
    };
    await scheduleDeliveryCommentaryForDelivery(options);
    await scheduleDeliveryCommentaryForDelivery({
      ...options,
      deliveryCommittedAtMs: Date.now(),
    });
    expect(synthesizeCalls).toHaveLength(1);
  });
});
