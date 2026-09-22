"use client";

import { useState } from "react";
import { DeleteMatchDialog } from "@/components/admin/delete-match-dialog";
import { cn } from "@/lib/utils/cn";

interface DeleteMatchButtonProps {
  matchId: string;
  matchNumber: string;
  opponentName: string;
  status: string;
  className?: string;
  onDeleted?: () => void;
}

/** Standalone delete trigger (e.g. setup ready page). Prefer AdminMatchOptionsMenu on dashboard. */
export function DeleteMatchButton({
  matchId,
  matchNumber,
  opponentName,
  status,
  className,
  onDeleted,
}: DeleteMatchButtonProps) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        className={cn(
          "rw-focus-ring rounded-full border border-red-500/35 bg-red-500/5 px-4 py-2 text-xs font-semibold text-red-700 hover:bg-red-500/10 dark:text-red-400",
          className,
        )}
        onClick={() => setOpen(true)}
      >
        Delete Match
      </button>
      <DeleteMatchDialog
        open={open}
        onClose={() => setOpen(false)}
        matchId={matchId}
        matchNumber={matchNumber}
        opponentName={opponentName}
        status={status}
        onDeleted={onDeleted}
      />
    </>
  );
}
