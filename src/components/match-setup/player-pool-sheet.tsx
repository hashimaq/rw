"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { Player } from "@/lib/database/types";
import {
  addKeyToMatchPool,
  clearMatchPool,
  guestKey,
  isGuestKeyReady,
  isKeyInXi,
  isKeyOnBench,
  playerKey,
  removeKeyFromXiByKey,
  resolveKeyDisplayName,
  selectAllOfficialInMatchPool,
  toggleBenchKey,
  xiSelectedCount,
  xiSelectionOrder,
  type GuestDraft,
  type WizardLineupState,
} from "@/lib/match-setup/build-payload";
import { OverlayPortal } from "@/components/ui/overlay-portal";
import { cn } from "@/lib/utils/cn";

export type PlayerPoolSheetMode = "xi" | "bench";

type PoolItem =
  | { kind: "official"; player: Player; key: string }
  | { kind: "guest"; index: number; key: string; draft: GuestDraft };

interface PlayerPoolSheetProps {
  open: boolean;
  onClose: () => void;
  mode: PlayerPoolSheetMode;
  players: Player[];
  lineup: WizardLineupState;
  onLineupChange: (next: WizardLineupState) => void;
}

function buildPool(players: Player[], guests: GuestDraft[]): PoolItem[] {
  const items: PoolItem[] = players.map((player) => ({
    kind: "official",
    player,
    key: playerKey(player.id),
  }));
  guests.forEach((draft, index) => {
    if (draft.full_name.trim()) {
      items.push({ kind: "guest", index, key: guestKey(index), draft });
    }
  });
  return items.sort((a, b) => {
    const nameA =
      a.kind === "official" ? a.player.full_name : a.draft.full_name;
    const nameB =
      b.kind === "official" ? b.player.full_name : b.draft.full_name;
    return nameA.localeCompare(nameB);
  });
}

export function PlayerPoolSheet({
  open,
  onClose,
  mode,
  players,
  lineup,
  onLineupChange,
}: PlayerPoolSheetProps) {
  const [search, setSearch] = useState("");
  const [guestName, setGuestName] = useState("");
  const [guestJersey, setGuestJersey] = useState("");
  const [guestOpen, setGuestOpen] = useState(false);
  const closeBtnRef = useRef<HTMLButtonElement>(null);
  const pool = useMemo(
    () => buildPool(players, lineup.guests),
    [players, lineup.guests],
  );

  const selectedCount = xiSelectedCount(lineup);
  const title =
    mode === "xi" ? "Select players" : "Select bench players";
  const countLabel =
    mode === "xi"
      ? `Selected: ${selectedCount}${players.length ? ` · ${players.length} available` : ""}`
      : `${lineup.benchKeys.length} on bench`;

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return pool;
    return pool.filter((item) => {
      const name =
        item.kind === "official"
          ? item.player.full_name
          : item.draft.full_name;
      return name.toLowerCase().includes(q);
    });
  }, [pool, search]);

  useEffect(() => {
    if (!open) {
      setSearch("");
      setGuestOpen(false);
      setGuestName("");
      setGuestJersey("");
      return;
    }
    closeBtnRef.current?.focus();
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prevOverflow;
      window.removeEventListener("keydown", onKey);
    };
  }, [open, onClose]);

  if (!open) return null;

  function toggleXiKey(key: string) {
    if (!isGuestKeyReady(key, lineup)) return;
    if (isKeyInXi(lineup, key)) {
      onLineupChange(removeKeyFromXiByKey(lineup, key));
      return;
    }
    if (isKeyOnBench(lineup, key)) return;
    onLineupChange(addKeyToMatchPool(lineup, key));
  }

  function confirmGuest() {
    const name = guestName.trim();
    if (!name) return;
    let jersey_number: number | null = null;
    if (guestJersey.trim() !== "") {
      const n = Number(guestJersey);
      if (Number.isFinite(n)) jersey_number = n;
    }
    const nextGuests = [...lineup.guests, { full_name: name, jersey_number }];
    const newKey = guestKey(nextGuests.length - 1);
    let next: WizardLineupState = { ...lineup, guests: nextGuests };
    if (mode === "xi") {
      next = addKeyToMatchPool(next, newKey);
    }
    onLineupChange(next);
    setGuestName("");
    setGuestJersey("");
    setGuestOpen(false);
  }

  function onRowClick(key: string) {
    if (mode === "bench") {
      if (isKeyInXi(lineup, key)) return;
      if (!isGuestKeyReady(key, lineup)) return;
      onLineupChange(toggleBenchKey(lineup, key));
      return;
    }
    toggleXiKey(key);
  }

  function handleSelectAll() {
    if (mode !== "xi") return;
    onLineupChange(
      selectAllOfficialInMatchPool(
        lineup,
        players.map((p) => p.id),
      ),
    );
  }

  function handleClearAll() {
    if (mode !== "xi") return;
    onLineupChange(clearMatchPool(lineup));
  }

  const sheet = (
    <div className="fixed inset-0 z-[100] flex items-end justify-center sm:items-center sm:p-4">
      <button
        type="button"
        className="absolute inset-0 bg-black/45 backdrop-blur-[2px]"
        aria-label="Close player selector"
        onClick={onClose}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="rw-player-pool-title"
        className="rw-sheet-panel relative flex h-[min(92dvh,640px)] max-h-[92dvh] w-full max-w-lg flex-col overflow-hidden rounded-t-[1.5rem] border border-[var(--rw-border)] bg-[var(--rw-surface)] shadow-[var(--rw-shadow-lg)] sm:h-[min(85vh,640px)] sm:max-h-[min(85vh,640px)] sm:rounded-[1.5rem]"
      >
        <div className="flex shrink-0 items-start justify-between gap-3 border-b border-[var(--rw-border)] px-5 py-4">
          <div className="min-w-0">
            <h2 id="rw-player-pool-title" className="text-lg font-semibold">
              {title}
            </h2>
            <p className="mt-0.5 text-sm font-bold tabular-nums text-[var(--rw-primary)]">
              {countLabel}
            </p>
          </div>
          <button
            ref={closeBtnRef}
            type="button"
            className="rw-focus-ring flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-[var(--rw-border)] bg-[var(--rw-surface-hover)] text-lg"
            aria-label="Close"
            onClick={onClose}
          >
            ×
          </button>
        </div>

        <div className="shrink-0 space-y-2 px-5 pt-3">
          <input
            type="search"
            className="rw-input w-full text-sm"
            placeholder="Search players…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            aria-label="Search players"
          />
          {mode === "xi" ? (
            <div className="flex gap-2">
              <button
                type="button"
                className="rw-focus-ring rw-btn-secondary flex-1 py-2.5 text-xs font-semibold"
                onClick={handleSelectAll}
              >
                Select all
              </button>
              <button
                type="button"
                className="rw-focus-ring rw-btn-secondary flex-1 py-2.5 text-xs font-semibold"
                onClick={handleClearAll}
                disabled={selectedCount === 0}
              >
                Clear all
              </button>
            </div>
          ) : null}
        </div>

        <ul className="min-h-0 flex-1 space-y-1.5 overflow-y-auto overscroll-contain px-5 py-3 touch-pan-y">
          {filtered.length === 0 ? (
            <li className="py-8 text-center text-sm text-[var(--rw-muted)]">
              No players match your search.
            </li>
          ) : (
            filtered.map((item) => {
              const key = item.key;
              const name =
                item.kind === "official"
                  ? item.player.full_name
                  : item.draft.full_name;
              const inXi = isKeyInXi(lineup, key);
              const onBench = isKeyOnBench(lineup, key);
              const order = xiSelectionOrder(lineup, key);
              const isXiMode = mode === "xi";
              const selected = isXiMode ? inXi : onBench;
              const blocked =
                (isXiMode && onBench) || (!isXiMode && inXi);

              return (
                <li key={key}>
                  <div
                    className={cn(
                      "flex items-center gap-2 rounded-xl border px-3 py-2.5 transition-colors",
                      selected
                        ? "border-[var(--rw-primary)]/35 bg-red-500/5"
                        : blocked
                          ? "border-[var(--rw-border)] opacity-45"
                          : "border-[var(--rw-border)]",
                    )}
                  >
                    <button
                      type="button"
                      disabled={blocked}
                      onClick={() => onRowClick(key)}
                      className={cn(
                        "rw-focus-ring flex min-h-12 min-w-0 flex-1 items-center gap-3 text-left text-sm",
                        blocked && "cursor-not-allowed",
                      )}
                      aria-pressed={selected}
                    >
                      <span
                        className={cn(
                          "flex h-9 w-9 shrink-0 items-center justify-center rounded-full border text-xs font-bold tabular-nums",
                          selected
                            ? "border-[var(--rw-primary)] bg-[var(--rw-primary)] text-white"
                            : "border-[var(--rw-border)] text-[var(--rw-muted)]",
                        )}
                        aria-hidden
                      >
                        {selected && isXiMode && order != null
                          ? order
                          : selected
                            ? "✓"
                            : "○"}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate font-semibold">
                          {name}
                        </span>
                        <span className="text-[11px] text-[var(--rw-muted)]">
                          {item.kind === "guest" ? (
                            <span className="font-bold uppercase tracking-wide text-amber-600 dark:text-amber-400">
                              Guest ·{" "}
                            </span>
                          ) : null}
                          {selected
                            ? isXiMode
                              ? "Selected"
                              : "On bench"
                            : blocked
                              ? isXiMode && onBench
                                ? "On bench"
                                : "In match squad"
                              : "Tap to select"}
                        </span>
                      </span>
                    </button>
                    {isXiMode && inXi ? (
                      <button
                        type="button"
                        className="rw-focus-ring flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-lg text-[var(--rw-muted)] hover:bg-[var(--rw-surface-hover)] hover:text-[var(--rw-text)]"
                        aria-label={`Remove ${name}`}
                        onClick={() =>
                          onLineupChange(removeKeyFromXiByKey(lineup, key))
                        }
                      >
                        ×
                      </button>
                    ) : !isXiMode && onBench ? (
                      <button
                        type="button"
                        className="rw-focus-ring flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-lg text-[var(--rw-muted)] hover:bg-[var(--rw-surface-hover)]"
                        aria-label={`Remove ${name} from bench`}
                        onClick={() =>
                          onLineupChange(toggleBenchKey(lineup, key))
                        }
                      >
                        ×
                      </button>
                    ) : null}
                  </div>
                </li>
              );
            })
          )}
        </ul>

        <div className="shrink-0 space-y-2 border-t border-[var(--rw-border)] px-5 py-3">
          {guestOpen ? (
            <div className="rounded-xl border border-[var(--rw-border)] bg-[var(--rw-surface-hover)]/50 p-3">
              <label className="block text-sm">
                <span className="mb-1 block font-medium">Guest full name</span>
                <input
                  className="rw-input w-full"
                  value={guestName}
                  onChange={(e) => setGuestName(e.target.value)}
                  placeholder="Required"
                  autoFocus
                />
              </label>
              <label className="mt-2 block text-sm">
                <span className="mb-1 block font-medium text-[var(--rw-muted)]">
                  Jersey number{" "}
                  <span className="font-normal">(optional)</span>
                </span>
                <input
                  className="rw-input w-full"
                  inputMode="numeric"
                  value={guestJersey}
                  onChange={(e) =>
                    setGuestJersey(e.target.value.replace(/\D/g, "").slice(0, 3))
                  }
                  placeholder="Optional"
                />
              </label>
              <div className="mt-3 flex gap-2">
                <button
                  type="button"
                  className="rw-focus-ring rw-btn-primary flex-1 py-2.5 text-xs font-semibold"
                  onClick={confirmGuest}
                >
                  Add guest
                </button>
                <button
                  type="button"
                  className="rw-focus-ring rw-btn-secondary flex-1 py-2.5 text-xs font-semibold"
                  onClick={() => setGuestOpen(false)}
                >
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <button
              type="button"
              className="rw-focus-ring rw-btn-secondary w-full py-2.5 text-xs font-semibold"
              onClick={() => setGuestOpen(true)}
            >
              + Add guest player
            </button>
          )}
        </div>

        <div className="shrink-0 border-t border-[var(--rw-border)] p-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
          <button
            type="button"
            className="rw-focus-ring rw-btn-primary w-full min-h-12 font-semibold"
            onClick={onClose}
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );

  return <OverlayPortal>{sheet}</OverlayPortal>;
}

/** Resolve bench player names for summary chips. */
export function benchSummaryNames(
  lineup: WizardLineupState,
  playersById: Map<string, Player>,
): string[] {
  return lineup.benchKeys.map((key) =>
    resolveKeyDisplayName(key, lineup, playersById),
  );
}
