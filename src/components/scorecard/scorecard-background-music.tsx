"use client";

import { useEffect } from "react";
import { enterScorecardMusicSession } from "@/lib/scorecard/scorecard-audio";

/**
 * Scorecard-only background music. Mount only on `/match/[slug]` success views.
 * No visible UI — autoplay is attempted once per scorecard page visit.
 */
export function ScorecardBackgroundMusic({ slug }: { slug: string }) {
  useEffect(() => {
    return enterScorecardMusicSession(slug);
  }, [slug]);

  return null;
}
