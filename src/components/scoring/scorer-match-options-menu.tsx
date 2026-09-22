"use client";

import { useEffect, useId, useRef, useState } from "react";
import { ScorerDeleteMatchDialog } from "@/components/scoring/scorer-delete-match-dialog";
import { OverlayPortal } from "@/components/ui/overlay-portal";
import { useMobileViewport } from "@/lib/hooks/use-mobile-viewport";
import { cn } from "@/lib/utils/cn";

interface ScorerMatchOptionsMenuProps {
  matchId: string;
  matchNumber: string;
  opponentName: string;
  status: string;
  onSuccessToast?: (message: string) => void;
  onErrorToast?: (message: string) => void;
}

export function ScorerMatchOptionsMenu({
  matchId,
  matchNumber,
  opponentName,
  status,
  onSuccessToast,
  onErrorToast,
}: ScorerMatchOptionsMenuProps) {
  const menuId = useId();
  const isMobile = useMobileViewport();
  const [open, setOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open || isMobile) return;
    function onPointerDown(e: MouseEvent) {
      if (!rootRef.current?.contains(e.target as Node)) {
        setOpen(false);
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
  }, [open, isMobile]);

  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
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

  const mobileSheet = (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
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
            vs {opponentName}
            <span className="ml-1.5 font-normal text-[var(--rw-muted)]">
              · {matchNumber}
            </span>
          </p>
        </div>
        <button
          type="button"
          role="menuitem"
          className="rw-focus-ring w-full px-4 py-3.5 text-left text-sm font-medium text-red-700 hover:bg-red-500/5 dark:text-red-400"
          onClick={openDelete}
        >
          Delete match
        </button>
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
  );

  const desktopDropdown = (
    <div
      role="menu"
      aria-label="Match options"
      className={cn(
        "absolute right-0 top-full z-20 mt-1 min-w-[11rem]",
        menuPanelClass,
      )}
    >
      <p className="px-4 py-2 text-xs font-semibold uppercase tracking-wide text-[var(--rw-muted)]">
        Match options
      </p>
      <button
        type="button"
        role="menuitem"
        className="rw-focus-ring w-full border-t border-[var(--rw-border)] px-4 py-3.5 text-left text-sm font-medium text-red-700 hover:bg-red-500/5 dark:text-red-400"
        onClick={openDelete}
      >
        Delete match
      </button>
    </div>
  );

  return (
    <div ref={rootRef} className="relative shrink-0">
      <button
        type="button"
        className="rw-focus-ring flex h-10 w-10 items-center justify-center rounded-full border border-[var(--rw-border)] bg-[var(--rw-surface)] text-lg font-bold leading-none text-[var(--rw-muted)] hover:bg-[var(--rw-surface-hover)] hover:text-[var(--rw-text)]"
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

      {open && isMobile ? (
        <OverlayPortal>{mobileSheet}</OverlayPortal>
      ) : null}
      {open && !isMobile ? desktopDropdown : null}

      <ScorerDeleteMatchDialog
        open={deleteOpen}
        onClose={() => setDeleteOpen(false)}
        matchId={matchId}
        matchNumber={matchNumber}
        opponentName={opponentName}
        status={status}
        onSuccessToast={onSuccessToast}
        onErrorToast={onErrorToast}
      />
    </div>
  );
}
