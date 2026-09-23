import { describe, expect, it, vi, beforeEach } from "vitest";

const runMatchAiAnalysisMock = vi.fn(async (_matchId: string) => undefined);

vi.mock("@/lib/supabase/admin", () => ({
  createServiceRoleClient: () => ({
    from: () => ({
      select: () => ({
        eq: () => ({
          maybeSingle: async () => ({ data: null }),
        }),
      }),
    }),
  }),
}));

vi.mock("@/lib/ai/run-match-ai-analysis", () => ({
  runMatchAiAnalysis: (matchId: string) => runMatchAiAnalysisMock(matchId),
}));

describe("ensureMatchAiAnalysisScheduled", () => {
  beforeEach(() => {
    runMatchAiAnalysisMock.mockClear();
  });

  it("schedules analysis for completed match with no existing row", async () => {
    const { ensureMatchAiAnalysisScheduled } = await import(
      "@/lib/ai/ensure-match-ai-analysis"
    );
    ensureMatchAiAnalysisScheduled({
      matchId: "m1",
      matchStatus: "completed",
      innings: [
        {
          id: "i1",
          innings_status: "completed",
          total_runs: 1,
          wickets: 0,
        } as never,
      ],
      deliveryRows: [
        {
          innings_id: "i1",
          total_runs: 1,
          is_wicket: false,
        } as never,
      ],
    });
    await new Promise((r) => setTimeout(r, 20));
    expect(runMatchAiAnalysisMock).toHaveBeenCalledWith("m1");
  });

  it("does not schedule for non-completed matches", async () => {
    const { ensureMatchAiAnalysisScheduled } = await import(
      "@/lib/ai/ensure-match-ai-analysis"
    );
    ensureMatchAiAnalysisScheduled({
      matchId: "m1",
      matchStatus: "live",
      innings: [],
      deliveryRows: [],
    });
    await new Promise((r) => setTimeout(r, 10));
    expect(runMatchAiAnalysisMock).not.toHaveBeenCalled();
  });
});
