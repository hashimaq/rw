"use client";

import { cn } from "@/lib/utils/cn";

export function ScorerConnectionStatus({
  isOnline,
  isSyncing,
  syncPending,
  syncError,
  className,
}: {
  isOnline: boolean;
  isSyncing: boolean;
  syncPending: number;
  syncError: string | null;
  className?: string;
}) {
  let label = "Online";
  let tone: "ok" | "warn" | "muted" = "ok";

  if (!isOnline) {
    label =
      syncPending > 0
        ? `Offline — ${syncPending} saved locally`
        : "Offline — saved locally";
    tone = "warn";
  } else if (syncError) {
    label = syncError;
    tone = "warn";
  } else if (isSyncing || syncPending > 0) {
    label = isSyncing ? "Syncing…" : `${syncPending} update(s) syncing…`;
    tone = "muted";
  } else {
    label = "All changes synced";
    tone = "ok";
  }

  return (
    <p
      role="status"
      className={cn(
        "text-[11px] font-medium leading-snug",
        tone === "ok" && "text-emerald-700 dark:text-emerald-400",
        tone === "warn" && "text-amber-800 dark:text-amber-300",
        tone === "muted" && "text-[var(--rw-muted)]",
        className,
      )}
    >
      {label}
    </p>
  );
}
