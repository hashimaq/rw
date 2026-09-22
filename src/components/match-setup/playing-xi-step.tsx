"use client";

import { useMemo, useState } from "react";
import type { Player } from "@/lib/database/types";
import {
  removeKeyFromXiByKey,
  resolveKeyDisplayName,
  xiSelectedCount,
  xiSelectionOrder,
  type WizardLineupState,
} from "@/lib/match-setup/build-payload";
import {
  PlayerPoolSheet,
  benchSummaryNames,
} from "@/components/match-setup/player-pool-sheet";
import { cn } from "@/lib/utils/cn";

interface PlayingXiStepProps {
  players: Player[];
  lineup: WizardLineupState;
  onLineupChange: (next: WizardLineupState) => void;
}

export function PlayingXiStep({
  players,
  lineup,
  onLineupChange,
}: PlayingXiStepProps) {
  const [xiSheetOpen, setXiSheetOpen] = useState(false);
  const [benchSheetOpen, setBenchSheetOpen] = useState(false);

  const playersById = useMemo(
    () => new Map(players.map((p) => [p.id, p])),
    [players],
  );

  const selectedCount = xiSelectedCount(lineup);
  const benchNames = benchSummaryNames(lineup, playersById);
  const selectedKeys = lineup.xiSlots;

  return (
    <div className="space-y-6">
      <section className="space-y-3">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold tracking-tight">
              Available players
            </h2>
            <p className="mt-0.5 text-sm font-bold tabular-nums text-[var(--rw-primary)]">
              Selected: {selectedCount}
              {players.length > 0 ? (
                <span className="font-normal text-[var(--rw-muted)]">
                  {" "}
                  · {players.length} in squad
                </span>
              ) : null}
            </p>
          </div>
          <button
            type="button"
            className="rw-focus-ring rw-btn-secondary shrink-0 px-4 py-2.5 text-xs font-semibold"
            onClick={() => setXiSheetOpen(true)}
          >
            {selectedCount > 0 ? "Edit players" : "+ Select players"}
          </button>
        </div>

        {selectedKeys.length > 0 ? (
          <ul className="max-h-64 space-y-1.5 overflow-y-auto rounded-xl border border-[var(--rw-border)] p-2">
            {selectedKeys.map((key) => {
              const order = xiSelectionOrder(lineup, key);
              return (
                <li key={key}>
                  <div
                    className={cn(
                      "flex min-h-12 items-center justify-between gap-2 rounded-xl border border-[var(--rw-primary)]/35 bg-red-500/5 px-3 py-2",
                    )}
                  >
                    <span className="min-w-0 text-sm font-semibold">
                      {order != null ? (
                        <span className="mr-1.5 tabular-nums text-[var(--rw-muted)]">
                          {order}.
                        </span>
                      ) : null}
                      {resolveKeyDisplayName(key, lineup, playersById)}
                      {key.startsWith("guest:") ? (
                        <span className="ml-1.5 text-[9px] font-bold uppercase tracking-wide text-amber-600 dark:text-amber-400">
                          Guest
                        </span>
                      ) : null}
                    </span>
                    <button
                      type="button"
                      className="rw-focus-ring flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-lg text-[var(--rw-muted)] hover:bg-[var(--rw-surface)]"
                      aria-label="Remove from match squad"
                      onClick={() =>
                        onLineupChange(removeKeyFromXiByKey(lineup, key))
                      }
                    >
                      ×
                    </button>
                  </div>
                </li>
              );
            })}
          </ul>
        ) : (
          <p className="rounded-xl border border-dashed border-[var(--rw-border)] px-4 py-6 text-center text-sm text-[var(--rw-muted)]">
            No players selected yet. Tap &quot;Select players&quot; to build
            your match squad.
          </p>
        )}

        {selectedCount > 0 && (!lineup.captainKey || !lineup.wicketkeeperKey) ? (
          <p className="text-xs text-amber-700 dark:text-amber-400">
            Choose one Captain and one Wicketkeeper below.
          </p>
        ) : null}
        {selectedCount > 0 &&
        lineup.captainKey &&
        lineup.wicketkeeperKey ? (
          <p className="text-xs font-semibold text-[var(--rw-primary)]">
            Squad ready — you can continue when captain and WK are set.
          </p>
        ) : null}
      </section>

      {selectedKeys.length > 0 ? (
        <section className="rw-card space-y-3 p-4">
          <h3 className="text-sm font-semibold">Captain &amp; Wicketkeeper</h3>
          <ul className="space-y-2">
            {selectedKeys.map((key) => {
              const name = resolveKeyDisplayName(key, lineup, playersById);
              const order = xiSelectionOrder(lineup, key);
              return (
                <li
                  key={key}
                  className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-[var(--rw-border)] px-3 py-2.5 text-sm"
                >
                  <span className="min-w-0 font-medium">
                    {order != null ? (
                      <span className="mr-1 tabular-nums text-[var(--rw-muted)]">
                        {order}.
                      </span>
                    ) : null}
                    {name}
                  </span>
                  <div className="flex flex-wrap gap-1.5">
                    <label className="inline-flex cursor-pointer items-center gap-1 rounded-full border border-[var(--rw-border)] px-2.5 py-1.5 text-[11px] font-semibold has-[:checked]:border-[var(--rw-primary)] has-[:checked]:bg-red-500/10">
                      <input
                        type="radio"
                        name="rw-captain"
                        checked={lineup.captainKey === key}
                        onChange={() =>
                          onLineupChange({ ...lineup, captainKey: key })
                        }
                        className="h-3.5 w-3.5 accent-[var(--rw-primary)]"
                      />
                      Captain
                    </label>
                    <label className="inline-flex cursor-pointer items-center gap-1 rounded-full border border-[var(--rw-border)] px-2.5 py-1.5 text-[11px] font-semibold has-[:checked]:border-[var(--rw-primary)] has-[:checked]:bg-red-500/10">
                      <input
                        type="radio"
                        name="rw-wk"
                        checked={lineup.wicketkeeperKey === key}
                        onChange={() =>
                          onLineupChange({ ...lineup, wicketkeeperKey: key })
                        }
                        className="h-3.5 w-3.5 accent-[var(--rw-primary)]"
                      />
                      WK
                    </label>
                  </div>
                </li>
              );
            })}
          </ul>
        </section>
      ) : null}

      <section className="space-y-2">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h3 className="text-sm font-semibold">
            Bench{" "}
            <span className="font-normal text-[var(--rw-muted)]">Optional</span>
          </h3>
          <button
            type="button"
            className="rw-focus-ring rw-btn-secondary px-3 py-2 text-xs font-semibold"
            onClick={() => setBenchSheetOpen(true)}
          >
            + Bench players
          </button>
        </div>
        {benchNames.length > 0 ? (
          <p className="text-xs text-[var(--rw-muted)]">
            {benchNames.join(", ")}
          </p>
        ) : (
          <p className="text-xs text-[var(--rw-muted)]">
            Bench players are not in the live batting/bowling pool.
          </p>
        )}
      </section>

      <PlayerPoolSheet
        open={xiSheetOpen}
        onClose={() => setXiSheetOpen(false)}
        mode="xi"
        players={players}
        lineup={lineup}
        onLineupChange={onLineupChange}
      />
      <PlayerPoolSheet
        open={benchSheetOpen}
        onClose={() => setBenchSheetOpen(false)}
        mode="bench"
        players={players}
        lineup={lineup}
        onLineupChange={onLineupChange}
      />
    </div>
  );
}
