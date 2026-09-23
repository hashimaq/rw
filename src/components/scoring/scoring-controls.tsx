"use client";

import { useState } from "react";
import { cn } from "@/lib/utils/cn";

export function ScoringKeypad({
  onRun,
  onLegBye,
  onBye,
  onWide,
  onNoBall,
  onMore,
  onDeadBall,
  onUndo,
  onOut,
  undoConfirm,
  scoringEnabled = true,
}: {
  onRun: (n: number) => void;
  onLegBye: () => void;
  onBye: () => void;
  onWide: () => void;
  onNoBall: () => void;
  onMore: () => void;
  onDeadBall: () => void;
  onUndo: () => void;
  onOut: () => void;
  undoConfirm: boolean;
  /** When false, only Undo remains active (e.g. new batter required). */
  scoringEnabled?: boolean;
}) {
  const keys: {
    id: string;
    label: string;
    aria: string;
    onClick: () => void;
    emphasis?: "out" | "undo";
  }[] = [
    { id: "1", label: "1", aria: "1 run", onClick: () => onRun(1) },
    { id: "2", label: "2", aria: "2 runs", onClick: () => onRun(2) },
    { id: "3", label: "3", aria: "3 runs", onClick: () => onRun(3) },
    { id: "4", label: "4", aria: "4 runs", onClick: () => onRun(4) },
    { id: "6", label: "6", aria: "6 runs", onClick: () => onRun(6) },
    { id: "lb", label: "LB", aria: "Leg bye", onClick: onLegBye },
    { id: "bye", label: "Bye", aria: "Bye", onClick: onBye },
    { id: "wide", label: "Wide", aria: "Wide", onClick: onWide },
    { id: "nb", label: "NB", aria: "No ball", onClick: onNoBall },
    { id: "0", label: "0", aria: "Dot ball", onClick: () => onRun(0) },
    { id: "more", label: "More", aria: "More options", onClick: onMore },
    { id: "5", label: "5", aria: "5 runs", onClick: () => onRun(5) },
    { id: "db", label: "DB", aria: "Dead ball", onClick: onDeadBall },
    {
      id: "undo",
      label: undoConfirm ? "Confirm" : "Undo",
      aria: undoConfirm ? "Confirm undo last ball" : "Undo last ball",
      onClick: onUndo,
      emphasis: "undo",
    },
    {
      id: "out",
      label: "Out",
      aria: "Wicket",
      onClick: onOut,
      emphasis: "out",
    },
  ];

  return (
    <section
      aria-label="Scoring pad"
      className="bg-[var(--rw-primary)] pb-[env(safe-area-inset-bottom)] text-white shadow-[0_-8px_24px_rgba(15,23,42,0.12)]"
    >
      <div className="grid grid-cols-5">
        {keys.map((key) => {
          const disabled =
            !scoringEnabled && key.emphasis !== "undo";
          return (
          <button
            key={key.id}
            type="button"
            aria-label={key.aria}
            disabled={disabled}
            className={cn(
              "rw-focus-ring flex min-h-[3.35rem] items-center justify-center border-r border-b border-white/20 px-1 text-[0.95rem] font-bold tracking-wide transition-transform active:scale-[0.97] sm:min-h-14",
              key.emphasis === "out" &&
                "bg-[color-mix(in_srgb,var(--rw-primary)_72%,black)] text-base uppercase",
              key.emphasis === "undo" && undoConfirm && "bg-white/15",
              disabled && "pointer-events-none opacity-40",
            )}
            onClick={key.onClick}
          >
            {key.label}
          </button>
        );
        })}
      </div>
    </section>
  );
}

export function OpponentBatterField({
  title,
  suggestions,
  onConfirm,
}: {
  title: string;
  suggestions: string[];
  onConfirm: (name: string) => void;
}) {
  const [name, setName] = useState("");
  const listId = "opponent-batter-suggestions";
  const trimmed = name.trim();

  return (
    <div className="rounded-2xl border border-[var(--rw-primary)]/40 bg-red-500/[0.04] p-4 shadow-sm">
      <p className="mb-3 font-semibold">{title}</p>
      <label className="block text-sm">
        <span className="mb-1 block font-medium">Opponent batter</span>
        <input
          className="rw-input w-full"
          value={name}
          list={listId}
          placeholder="Enter opponent batter"
          onChange={(e) => setName(e.target.value)}
          autoComplete="off"
        />
        <datalist id={listId}>
          {suggestions.map((s) => (
            <option key={s} value={s} />
          ))}
        </datalist>
      </label>
      <button
        type="button"
        disabled={!trimmed}
        className="rw-focus-ring rw-btn-primary mt-3 w-full min-h-11 disabled:opacity-50"
        onClick={() => onConfirm(trimmed)}
      >
        Confirm batter
      </button>
    </div>
  );
}

export function OpponentBowlerField({
  title,
  suggestions,
  forbiddenName,
  onConfirm,
}: {
  title: string;
  suggestions: string[];
  forbiddenName?: string | null;
  onConfirm: (name: string) => void;
}) {
  const [name, setName] = useState("");
  const listId = "opponent-bowler-suggestions";
  const trimmed = name.trim();
  const blocked =
    forbiddenName &&
    trimmed.toLowerCase() === forbiddenName.trim().toLowerCase();

  return (
    <div className="rounded-2xl border border-[var(--rw-primary)]/40 bg-red-500/[0.04] p-4 shadow-sm">
      <p className="mb-3 font-semibold">{title}</p>
      <label className="block text-sm">
        <span className="mb-1 block font-medium">Opponent bowler</span>
        <input
          className="rw-input w-full"
          value={name}
          list={listId}
          placeholder="Enter name"
          onChange={(e) => setName(e.target.value)}
          autoComplete="off"
        />
        <datalist id={listId}>
          {suggestions.map((s) => (
            <option key={s} value={s} />
          ))}
        </datalist>
      </label>
      {blocked ? (
        <p className="mt-2 text-xs text-red-600 dark:text-red-400">
          Same bowler cannot bowl consecutive overs.
        </p>
      ) : null}
      <button
        type="button"
        disabled={!trimmed || Boolean(blocked)}
        className="rw-focus-ring rw-btn-primary mt-3 w-full min-h-11 disabled:opacity-50"
        onClick={() => onConfirm(trimmed)}
      >
        Confirm bowler
      </button>
    </div>
  );
}
