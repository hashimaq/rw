import { beforeEach, describe, expect, it, vi } from "vitest";

const synthesizeCalls: string[] = [];

vi.mock("@/lib/ai/gemini/config", () => ({
  isGeminiConfigured: () => true,
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
  status: string;
};

function createMockSupabase(initial: CommentaryRow) {
  const row = { ...initial };
  return {
    row,
    client: {
      from(table: string) {
        if (table !== "delivery_commentary") {
          throw new Error(`unexpected table ${table}`);
        }
        return {
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
                            if (
                              row.client_event_id !== clientEventId ||
                              !statuses.includes(row.status)
                            ) {
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
            Object.assign(row, patch);
            return {
              eq: async () => ({ error: null }),
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

let mockSupabase = createMockSupabase({
  client_event_id: "11111111-1111-1111-1111-111111111111",
  status: "pending",
});

vi.mock("@/lib/supabase/admin", () => ({
  createServiceRoleClient: () => mockSupabase.client,
}));

const context = {
  clientEventId: "11111111-1111-1111-1111-111111111111",
  matchId: "22222222-2222-2222-2222-222222222222",
  inningsId: "33333333-3333-3333-3333-333333333333",
  sequenceInInnings: 1,
} as import("@/lib/commentary/delivery-commentary-context").DeliveryCommentaryContext;

beforeEach(() => {
  synthesizeCalls.length = 0;
  mockSupabase = createMockSupabase({
    client_event_id: context.clientEventId,
    status: "pending",
  });
});

describe("runDeliveryCommentaryJob claim", () => {
  it("runs TTS once for two concurrent job invocations", async () => {
    const { runDeliveryCommentaryJob } = await import(
      "@/lib/commentary/run-delivery-commentary"
    );
    await Promise.all([
      runDeliveryCommentaryJob(context),
      runDeliveryCommentaryJob(context),
    ]);
    expect(synthesizeCalls).toHaveLength(1);
    expect(mockSupabase.row.status).toBe("ready");
  });

  it("does not run TTS when row is already processing", async () => {
    mockSupabase = createMockSupabase({
      client_event_id: context.clientEventId,
      status: "processing",
    });
    const { runDeliveryCommentaryJob } = await import(
      "@/lib/commentary/run-delivery-commentary"
    );
    await runDeliveryCommentaryJob(context);
    expect(synthesizeCalls).toHaveLength(0);
  });
});
