"use client";

import { useMemo, useState } from "react";
import type { ParticipantRef } from "@/lib/scoring/participant";
import { participantKey } from "@/lib/scoring-engine/utils";
import { cn } from "@/lib/utils/cn";

const OTHER = "__other__";

export interface RwBatterOption {
  id: string;
  name: string;
  isGuest?: boolean;
}

export function RwBatterSelect({
  label,
  value,
  onChange,
  options,
  disabledIds,
  onCreateGuest,
}: {
  label: string;
  value: string;
  onChange: (id: string) => void;
  options: RwBatterOption[];
  disabledIds?: Set<string>;
  onCreateGuest: (name: string) => Promise<RwBatterOption | null>;
}) {
  const [guestName, setGuestName] = useState("");
  const [adding, setAdding] = useState(false);
  const showOtherForm = value === OTHER;

  return (
    <label className="block text-sm">
      <span className="mb-1 block font-medium">{label}</span>
      <select
        className="rw-input w-full"
        value={value}
        onChange={(e) => onChange(e.target.value)}
      >
        <option value="">Select Red Wings player…</option>
        {options.map((p) => (
          <option key={p.id} value={p.id} disabled={disabledIds?.has(p.id)}>
            {p.name}
            {p.isGuest ? " (Guest)" : ""}
          </option>
        ))}
        <option value={OTHER}>Other — unlisted player</option>
      </select>
      {showOtherForm ? (
        <div className="mt-2 space-y-2 rounded-xl border border-[var(--rw-border)] p-3">
          <p className="text-xs text-[var(--rw-muted)]">Enter player name</p>
          <input
            className="rw-input w-full"
            placeholder="Player name"
            value={guestName}
            onChange={(e) => setGuestName(e.target.value)}
            autoComplete="off"
          />
          <button
            type="button"
            disabled={adding || !guestName.trim()}
            className="rw-focus-ring rw-btn-primary w-full min-h-10 text-sm font-semibold disabled:opacity-50"
            onClick={() => {
              void (async () => {
                setAdding(true);
                try {
                  const created = await onCreateGuest(guestName.trim());
                  if (created) {
                    onChange(created.id);
                    setGuestName("");
                  }
                } finally {
                  setAdding(false);
                }
              })();
            }}
          >
            {adding ? "Adding…" : "Add"}
          </button>
        </div>
      ) : null}
    </label>
  );
}

export function RwBatterPickSheet({
  title,
  subtitle,
  options,
  disabledKeys,
  onPick,
  onCreateGuest,
}: {
  title: string;
  subtitle?: string;
  options: RwBatterOption[];
  disabledKeys?: Set<string>;
  onPick: (p: ParticipantRef) => void;
  onCreateGuest: (name: string) => Promise<RwBatterOption | null>;
}) {
  const [mode, setMode] = useState<"list" | "other">("list");
  const [guestName, setGuestName] = useState("");
  const [adding, setAdding] = useState(false);
  const [search, setSearch] = useState("");

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return options;
    return options.filter((p) => p.name.toLowerCase().includes(q));
  }, [options, search]);

  if (options.length === 0 && mode === "list") {
    return (
      <div className="rounded-2xl border border-[var(--rw-primary)]/40 bg-red-500/[0.04] p-4 shadow-sm">
        <p className="font-semibold">{title}</p>
        {subtitle ? (
          <p className="mt-1 text-xs text-[var(--rw-muted)]">{subtitle}</p>
        ) : null}
        <p className="mt-3 text-sm text-[var(--rw-muted)]">
          No available players in the squad list. Add an unlisted player below.
        </p>
        <button
          type="button"
          className="rw-focus-ring mt-3 w-full rounded-xl border border-dashed border-[var(--rw-border)] px-3 py-2.5 text-left text-sm font-semibold"
          onClick={() => setMode("other")}
        >
          Other — unlisted player
        </button>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-[var(--rw-primary)]/40 bg-red-500/[0.04] p-4 shadow-sm">
      <p className="font-semibold">{title}</p>
      {subtitle ? (
        <p className="mt-1 text-xs text-[var(--rw-muted)]">{subtitle}</p>
      ) : null}
      {mode === "list" ? (
        <>
          {options.length > 6 ? (
            <input
              type="search"
              className="rw-input mt-3 w-full text-sm"
              placeholder="Search players…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              aria-label="Search players"
            />
          ) : null}
          <ul className="mt-3 max-h-64 space-y-1 overflow-y-auto overscroll-y-contain">
          {filtered.length === 0 ? (
            <li className="rounded-xl border border-dashed border-[var(--rw-border)] px-3 py-4 text-center text-sm text-[var(--rw-muted)]">
              No players match your search. Try &quot;Other — unlisted player&quot;
              below.
            </li>
          ) : null}
          {filtered.map((p) => {
            const disabled = disabledKeys?.has(participantKey(p.id, p.name));
            return (
              <li key={p.id}>
                <button
                  type="button"
                  disabled={disabled}
                  className={cn(
                    "rw-focus-ring w-full min-h-12 rounded-xl border px-3 py-2.5 text-left text-sm font-semibold",
                    disabled
                      ? "cursor-not-allowed border-[var(--rw-border)] opacity-40"
                      : "border-[var(--rw-border)] bg-[var(--rw-surface)] hover:border-[var(--rw-primary)]/40",
                  )}
                  onClick={() => onPick({ playerId: p.id, name: p.name })}
                >
                  {p.name}
                  {p.isGuest ? (
                    <span className="ml-2 text-[10px] font-semibold uppercase text-[var(--rw-muted)]">
                      Guest
                    </span>
                  ) : null}
                </button>
              </li>
            );
          })}
          <li>
            <button
              type="button"
              className="rw-focus-ring w-full rounded-xl border border-dashed border-[var(--rw-border)] px-3 py-2.5 text-left text-sm font-semibold"
              onClick={() => setMode("other")}
            >
              Other — unlisted player
            </button>
          </li>
        </ul>
        </>
      ) : (
        <div className="mt-3 space-y-2">
          <p className="text-xs text-[var(--rw-muted)]">Enter player name</p>
          <input
            className="rw-input w-full"
            placeholder="Player name"
            value={guestName}
            onChange={(e) => setGuestName(e.target.value)}
            autoComplete="off"
          />
          <div className="flex gap-2">
            <button
              type="button"
              className="rw-focus-ring flex-1 min-h-10 rounded-xl border text-sm font-semibold"
              onClick={() => {
                setMode("list");
                setGuestName("");
              }}
            >
              Back
            </button>
            <button
              type="button"
              disabled={adding || !guestName.trim()}
              className="rw-focus-ring rw-btn-primary flex-1 min-h-10 text-sm font-semibold disabled:opacity-50"
              onClick={() => {
                void (async () => {
                  setAdding(true);
                  try {
                    const created = await onCreateGuest(guestName.trim());
                    if (created) {
                      onPick({ playerId: created.id, name: created.name });
                      setGuestName("");
                      setMode("list");
                    }
                  } finally {
                    setAdding(false);
                  }
                })();
              }}
            >
              {adding ? "Adding…" : "Add"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
