"use client";

import { useState } from "react";
import { ScorerDeleteMatchDialog } from "@/components/scoring/scorer-delete-match-dialog";

interface ScorerMatchDeleteInfoTriggerProps {
  matchId: string;
  matchNumber: string;
  opponentName: string;
  status: string;
}

/** Info tab: secondary delete entry (away from scoring keypad). */
export function ScorerMatchDeleteInfoTrigger(props: ScorerMatchDeleteInfoTriggerProps) {
  const [open, setOpen] = useState(false);

  return (
    <div className="mt-8 border-t border-[var(--rw-border)] pt-4">
      <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-[var(--rw-muted)]">
        Match options
      </p>
      <button
        type="button"
        className="rw-focus-ring mt-2 text-sm font-medium text-red-700 hover:underline dark:text-red-400"
        onClick={() => setOpen(true)}
      >
        Delete match…
      </button>
      <ScorerDeleteMatchDialog
        open={open}
        onClose={() => setOpen(false)}
        {...props}
      />
    </div>
  );
}
