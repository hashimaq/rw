"use client";

import { useCallback, useState } from "react";
import { AdminMatchOptionsMenu } from "@/components/admin/admin-match-options-menu";
import { MatchCard } from "@/components/ui/match-card";
import type { Match } from "@/lib/database/types";
import { cn } from "@/lib/utils/cn";

interface AdminMatchListItemProps {
  match: Match;
  showAdminActions: boolean;
}

function AdminToast({
  message,
  variant,
  onDismiss,
}: {
  message: string;
  variant: "success" | "error";
  onDismiss: () => void;
}) {
  return (
    <div
      role="status"
      className={cn(
        "fixed bottom-4 left-1/2 z-[70] w-[min(100%-2rem,24rem)] -translate-x-1/2 rounded-xl border px-4 py-3 text-sm font-medium shadow-lg",
        variant === "success"
          ? "border-emerald-600/30 bg-emerald-500/10 text-emerald-900 dark:text-emerald-100"
          : "border-red-500/30 bg-red-500/10 text-red-800 dark:text-red-100",
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <span>{message}</span>
        <button
          type="button"
          className="rw-focus-ring shrink-0 text-xs opacity-70"
          onClick={onDismiss}
          aria-label="Dismiss"
        >
          ×
        </button>
      </div>
    </div>
  );
}

export function AdminMatchListItem({
  match: initialMatch,
  showAdminActions,
}: AdminMatchListItemProps) {
  const [removed, setRemoved] = useState(false);
  const [toast, setToast] = useState<{
    message: string;
    variant: "success" | "error";
  } | null>(null);
  const match = initialMatch;

  const showSuccessToast = useCallback((message: string) => {
    setToast({ message, variant: "success" });
    window.setTimeout(() => setToast(null), 4000);
  }, []);

  const showErrorToast = useCallback((message: string) => {
    setToast({ message, variant: "error" });
    window.setTimeout(() => setToast(null), 5000);
  }, []);

  if (removed) return null;

  return (
    <>
      <MatchCard
        match={match}
        live={match.status === "live"}
        href={
          showAdminActions
            ? undefined
            : match.share_slug
              ? `/live/${match.share_slug}`
              : undefined
        }
        headerAction={
          showAdminActions ? (
            <AdminMatchOptionsMenu
              match={match}
              onDeleted={() => setRemoved(true)}
              onSuccessToast={showSuccessToast}
              onErrorToast={showErrorToast}
            />
          ) : undefined
        }
      />
      {toast ? (
        <AdminToast
          message={toast.message}
          variant={toast.variant}
          onDismiss={() => setToast(null)}
        />
      ) : null}
    </>
  );
}
