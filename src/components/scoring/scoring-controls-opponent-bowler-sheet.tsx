"use client";

import { useMemo, useState } from "react";
import type { ParticipantRef } from "@/lib/scoring/participant";
import { participantKey } from "@/lib/scoring-engine/utils";
import { cn } from "@/lib/utils/cn";

export function OpponentBowlerPickSheet({
  title,
  subtitle,
  bowlers,
  forbiddenKey,
  onPick,
  onConfirmNew,
}: {
  title: string;
  subtitle?: string;
  bowlers: ParticipantRef[];
  forbiddenKey: string | null;
  onPick: (bowler: ParticipantRef) => void;
  onConfirmNew: (name: string) => void;
}) {
  const [mode, setMode] = useState<"list" | "new">("list");
  const [search, setSearch] = useState("");
  const [newName, setNewName] = useState("");

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return bowlers;
    return bowlers.filter((b) => b.name.toLowerCase().includes(q));
  }, [bowlers, search]);

  const trimmedNew = newName.trim();
  const newBlocked =
    forbiddenKey != null &&
    trimmedNew &&
    participantKey(null, trimmedNew) === forbiddenKey;

  if (mode === "new") {
    return (
      <div className="rounded-2xl border border-[var(--rw-primary)]/40 bg-red-500/[0.04] p-4 shadow-sm">
        <p className="font-semibold">{title}</p>
        <p className="mt-1 text-xs text-[var(--rw-muted)]">
          Enter a new opponent bowler name
        </p>
        <label className="mt-3 block text-sm">
          <span className="mb-1 block font-medium">Bowler name</span>
          <input
            className="rw-input w-full"
            value={newName}
            placeholder="e.g. Usman"
            onChange={(e) => setNewName(e.target.value)}
            autoComplete="off"
          />
        </label>
        {newBlocked ? (
          <p className="mt-2 text-xs text-red-600 dark:text-red-400">
            Bowled last over — choose another bowler.
          </p>
        ) : null}
        <div className="mt-4 flex flex-col gap-2">
          <button
            type="button"
            disabled={!trimmedNew || Boolean(newBlocked)}
            className="rw-focus-ring rw-btn-primary min-h-11 w-full disabled:opacity-50"
            onClick={() => onConfirmNew(trimmedNew)}
          >
            Confirm bowler
          </button>
          <button
            type="button"
            className="rw-focus-ring min-h-11 w-full rounded-full border border-[var(--rw-border)] text-sm font-medium"
            onClick={() => setMode("list")}
          >
            Back to list
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-[var(--rw-primary)]/40 bg-red-500/[0.04] p-4 shadow-sm">
      <p className="font-semibold">{title}</p>
      {subtitle ? (
        <p className="mt-1 text-xs text-[var(--rw-muted)]">{subtitle}</p>
      ) : null}
      {bowlers.length > 4 ? (
        <input
          type="search"
          className="rw-input mt-3 w-full text-sm"
          placeholder="Search bowlers…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          aria-label="Search bowlers"
        />
      ) : null}
      <ul className="mt-3 max-h-52 space-y-1 overflow-y-auto overscroll-contain">
        {filtered.map((b) => {
          const key = participantKey(b.playerId, b.name);
          const disabled = forbiddenKey != null && key === forbiddenKey;
          return (
            <li key={key}>
              <button
                type="button"
                disabled={disabled}
                className={cn(
                  "rw-focus-ring w-full rounded-xl border px-3 py-2.5 text-left text-sm",
                  disabled
                    ? "cursor-not-allowed border-[var(--rw-border)] opacity-50"
                    : "border-[var(--rw-border)] bg-[var(--rw-surface)] font-semibold hover:border-[var(--rw-primary)]/40",
                )}
                onClick={() => onPick(b)}
              >
                <span className="font-semibold">{b.name}</span>
                {disabled ? (
                  <span className="mt-0.5 block text-[11px] font-normal text-[var(--rw-muted)]">
                    Bowled last over
                  </span>
                ) : null}
              </button>
            </li>
          );
        })}
        {filtered.length === 0 ? (
          <li className="py-2 text-xs text-[var(--rw-muted)]">
            No previous bowlers yet.
          </li>
        ) : null}
      </ul>
      <button
        type="button"
        className="rw-focus-ring mt-3 min-h-11 w-full rounded-full border border-dashed border-[var(--rw-primary)]/50 text-sm font-semibold text-[var(--rw-primary)]"
        onClick={() => {
          setNewName("");
          setMode("new");
        }}
      >
        Enter new bowler
      </button>
    </div>
  );
}
