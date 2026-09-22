"use client";

import { useState } from "react";
import { ScorerDeleteMatchDialog } from "@/components/scoring/scorer-delete-match-dialog";
import { useScoringSessionStatus } from "@/lib/scoring/use-scoring-session-status";

interface ScorerMatchDeleteSectionProps {
  slug: string;
  matchId: string;
  matchNumber: string;
  opponentName: string;
  status: string;
}

/** Setup / ready page: delete when this browser is the scoring controller. */
export function ScorerMatchDeleteSection({
  slug,
  matchId,
  matchNumber,
  opponentName,
  status,
}: ScorerMatchDeleteSectionProps) {
  const session = useScoringSessionStatus(slug, matchId);
  const [open, setOpen] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  if (session.loading || session.scoring_role !== "controller") {
    return null;
  }

  return (
    <div className="flex flex-col items-center border-t border-[var(--rw-border)] pt-6">
      <button
        type="button"
        className="rw-focus-ring text-sm font-medium text-red-700 underline-offset-2 hover:underline dark:text-red-400"
        onClick={() => setOpen(true)}
      >
        Delete match and start over
      </button>
      {toast ? (
        <p className="mt-2 text-sm text-emerald-700 dark:text-emerald-300" role="status">
          {toast}
        </p>
      ) : null}
      <ScorerDeleteMatchDialog
        open={open}
        onClose={() => setOpen(false)}
        matchId={matchId}
        matchNumber={matchNumber}
        opponentName={opponentName}
        status={status}
        onSuccessToast={(msg) => setToast(msg)}
      />
    </div>
  );
}
