import "server-only";

import { persistedScorecardDataIncomplete } from "@/lib/scorecard/scorecard-persisted-integrity";
import type { Delivery, InningsRow } from "@/lib/database/types";
import { createServiceRoleClient } from "@/lib/supabase/admin";
import { runMatchAiAnalysis } from "@/lib/ai/run-match-ai-analysis";

const PROCESSING_STALE_MS = 12 * 60 * 1000;
const FAILED_RETRY_COOLDOWN_MS = 3 * 60 * 1000;

function isRecent(iso: string | null | undefined, maxAgeMs: number): boolean {
  if (!iso) return false;
  const t = Date.parse(iso);
  if (Number.isNaN(t)) return false;
  return Date.now() - t < maxAgeMs;
}

export type EnsureMatchAiAnalysisInput = {
  matchId: string;
  matchStatus: string;
  innings: InningsRow[];
  deliveryRows: Delivery[];
};

/**
 * Ensures a completed match eventually gets AI analysis without user action.
 * Safe to call on scorecard load — does not block the response.
 */
export function ensureMatchAiAnalysisScheduled(
  input: EnsureMatchAiAnalysisInput,
): void {
  if (input.matchStatus !== "completed") return;
  if (
    persistedScorecardDataIncomplete(input.innings, input.deliveryRows)
  ) {
    return;
  }

  void (async () => {
    try {
      const supabase = createServiceRoleClient();
      const { data: row } = await supabase
        .from("match_ai_analysis")
        .select("status, error_message, updated_at, generated_at")
        .eq("match_id", input.matchId)
        .maybeSingle();

      if (row?.status === "completed") return;

      if (
        row?.status === "processing" &&
        isRecent(row.updated_at, PROCESSING_STALE_MS)
      ) {
        return;
      }

      if (row?.status === "failed") {
        if (row.error_message === "incomplete_match_data") return;
        if (isRecent(row.generated_at, FAILED_RETRY_COOLDOWN_MS)) return;
      }

      await runMatchAiAnalysis(input.matchId);
    } catch (err) {
      console.error(
        "[match-ai] ensure scheduled failed:",
        input.matchId,
        err instanceof Error ? err.message : err,
      );
    }
  })();
}
