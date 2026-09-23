"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";
import type { MatchAiAnalysisView } from "@/lib/ai/match-analysis-types";

const REFRESH_MS = 12_000;
const MAX_POLLS = 20;

/** Soft refresh while server-side AI analysis is in flight — no Gemini from client. */
export function MatchAiAutoRefresh({
  aiAnalysis,
  enabled,
}: {
  aiAnalysis: MatchAiAnalysisView | undefined;
  enabled: boolean;
}) {
  const router = useRouter();
  const pending =
    enabled &&
    (aiAnalysis?.state === "pending" ||
      aiAnalysis?.state === "processing");

  useEffect(() => {
    if (!pending) return;
    let count = 0;
    const id = window.setInterval(() => {
      count += 1;
      if (count > MAX_POLLS) {
        window.clearInterval(id);
        return;
      }
      router.refresh();
    }, REFRESH_MS);
    return () => window.clearInterval(id);
  }, [pending, router]);

  return null;
}
