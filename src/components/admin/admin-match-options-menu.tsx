"use client";

import Link from "next/link";
import { useEffect, useId, useRef, useState } from "react";
import { DeleteMatchDialog } from "@/components/admin/delete-match-dialog";
import { TakeScoringControlButton } from "@/components/admin/take-scoring-control-button";
import type { Match } from "@/lib/database/types";
import { publicScorecardPath } from "@/lib/match/share-slug";
import { cn } from "@/lib/utils/cn";

interface AdminMatchOptionsMenuProps {
  match: Match;
  onDeleted?: () => void;
  onSuccessToast?: (message: string) => void;
  onErrorToast?: (message: string) => void;
}

export function AdminMatchOptionsMenu({
  match,
  onDeleted,
  onSuccessToast,
  onErrorToast,
}: AdminMatchOptionsMenuProps) {
  const menuId = useId();
  const [open, setOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  const viewHref = match.share_slug ? `/live/${match.share_slug}` : null;
  const scorecardHref =
    match.share_slug && match.status === "completed"
      ? publicScorecardPath(match.share_slug)
      : null;
  const showTakeControl =
    match.status === "live" || match.status === "setup";

  useEffect(() => {
    if (!open) return;
    function onPointerDown(e: MouseEvent) {
      if (window.matchMedia("(min-width: 640px)").matches) {
        if (!rootRef.current?.contains(e.target as Node)) {
          setOpen(false);
        }
      }
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  function closeMenu() {
    setOpen(false);
  }

  function openDelete() {
    setOpen(false);
    setDeleteOpen(true);
  }

  const menuPanelClass =
    "overflow-hidden rounded-2xl border border-[var(--rw-border)] bg-[var(--rw-surface)] py-1 shadow-[var(--rw-shadow-lg)]";

  const menuItems = (
    <>
      {viewHref ? (
        <Link
          role="menuitem"
          href={viewHref}
          className="rw-focus-ring block px-4 py-3.5 text-sm font-medium hover:bg-[var(--rw-surface-hover)]"
          onClick={closeMenu}
        >
          View match
        </Link>
      ) : null}
      {scorecardHref ? (
        <Link
          role="menuitem"
          href={scorecardHref}
          className="rw-focus-ring block px-4 py-3.5 text-sm font-medium hover:bg-[var(--rw-surface-hover)]"
          onClick={closeMenu}
        >
          View scorecard
        </Link>
      ) : null}
      {showTakeControl ? (
        <div className="border-t border-[var(--rw-border)] px-2 py-2">
          <TakeScoringControlButton
            matchId={match.id}
            status={match.status}
            menuItem
            onDone={closeMenu}
          />
        </div>
      ) : null}
      <button
        type="button"
        role="menuitem"
        className={cn(
          "rw-focus-ring w-full px-4 py-3.5 text-left text-sm font-medium text-red-700 hover:bg-red-500/5 dark:text-red-400",
          (viewHref || showTakeControl) && "border-t border-[var(--rw-border)]",
        )}
        onClick={openDelete}
      >
        Delete match
      </button>
    </>
  );

  return (
    <div ref={rootRef} className="relative shrink-0">
      <button
        type="button"
        className="rw-focus-ring flex h-11 w-11 items-center justify-center rounded-full border border-[var(--rw-border)] bg-[var(--rw-surface)] text-lg font-bold leading-none text-[var(--rw-muted)] hover:bg-[var(--rw-surface-hover)] hover:text-[var(--rw-text)]"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={menuId}
        aria-label="Match options"
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          setOpen((v) => !v);
        }}
      >
        ⋮
      </button>

      {open ? (
        <>
          {/* Mobile: centered sheet so options are not clipped off-screen */}
          <div className="fixed inset-0 z-[55] flex items-center justify-center p-4 sm:hidden">
            <button
              type="button"
              className="absolute inset-0 bg-black/45 backdrop-blur-[2px]"
              aria-label="Close match options"
              onClick={closeMenu}
            />
            <div
              id={menuId}
              role="menu"
              aria-label="Match options"
              className={cn("relative w-full max-w-sm", menuPanelClass)}
            >
              <div className="border-b border-[var(--rw-border)] px-4 py-3">
                <p className="text-xs font-semibold uppercase tracking-wide text-[var(--rw-muted)]">
                  Match options
                </p>
                <p className="mt-1 truncate text-sm font-semibold">
                  vs {match.opponent_name}
                  <span className="ml-1.5 font-normal text-[var(--rw-muted)]">
                    · {match.match_number}
                  </span>
                </p>
              </div>
              {menuItems}
              <div className="border-t border-[var(--rw-border)] p-2">
                <button
                  type="button"
                  className="rw-focus-ring w-full rounded-xl px-4 py-3 text-sm font-medium text-[var(--rw-muted)] hover:bg-[var(--rw-surface-hover)]"
                  onClick={closeMenu}
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>

          {/* Desktop: compact dropdown anchored to ⋮ */}
          <div
            role="menu"
            aria-label="Match options"
            className={cn(
              "absolute right-0 top-full z-20 mt-1 hidden min-w-[11rem] sm:block",
              menuPanelClass,
            )}
          >
            {menuItems}
          </div>
        </>
      ) : null}

      <DeleteMatchDialog
        open={deleteOpen}
        onClose={() => setDeleteOpen(false)}
        matchId={match.id}
        matchNumber={match.match_number}
        opponentName={match.opponent_name}
        status={match.status}
        onDeleted={onDeleted}
        onSuccessToast={onSuccessToast}
        onErrorToast={onErrorToast}
      />
    </div>
  );
}
