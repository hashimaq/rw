"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import type { Player } from "@/lib/database/types";
import { EmptyState } from "@/components/ui/empty-state";
import { ErrorState } from "@/components/ui/error-state";

interface SquadManagerProps {
  initialPlayers: Player[];
  isAdmin: boolean;
}

type FormMode = "create" | "edit" | null;

export function SquadManager({ initialPlayers, isAdmin }: SquadManagerProps) {
  const [players, setPlayers] = useState(initialPlayers);
  const [query, setQuery] = useState("");
  const [showInactive, setShowInactive] = useState(false);
  const [mode, setMode] = useState<FormMode>(null);
  const [editing, setEditing] = useState<Player | null>(null);
  const [fullName, setFullName] = useState("");
  const [jersey, setJersey] = useState("");
  const [formBusy, setFormBusy] = useState(false);
  const [statusBusyId, setStatusBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [duplicateHint, setDuplicateHint] = useState<string | null>(null);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return players
      .filter((p) => (showInactive ? true : p.is_active && !p.archived_at))
      .filter((p) => {
        if (!q) return true;
        return (
          p.full_name.toLowerCase().includes(q) ||
          (p.jersey_number != null && String(p.jersey_number).includes(q))
        );
      });
  }, [players, query, showInactive]);

  function openCreate() {
    setMode("create");
    setEditing(null);
    setFullName("");
    setJersey("");
    setError(null);
    setDuplicateHint(null);
  }

  function openEdit(player: Player) {
    setMode("edit");
    setEditing(player);
    setFullName(player.full_name);
    setJersey(
      player.jersey_number != null ? String(player.jersey_number) : "",
    );
    setError(null);
    setDuplicateHint(null);
  }

  async function submitForm(e: React.FormEvent) {
    e.preventDefault();
    if (!isAdmin) return;
    setFormBusy(true);
    setError(null);
    setDuplicateHint(null);

    const payload: { full_name: string; jersey_number?: number | null } = {
      full_name: fullName,
    };
    if (jersey.trim() !== "") {
      payload.jersey_number = Number(jersey);
    } else if (mode === "edit") {
      payload.jersey_number = null;
    }

    try {
      const res = await fetch(
        mode === "edit" && editing
          ? `/api/admin/players/${editing.id}`
          : "/api/admin/players",
        {
          method: mode === "edit" ? "PATCH" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        },
      );
      const body = await res.json().catch(() => ({}));
      if (!res.ok) {
        if (body.error === "duplicate_player" && body.similar?.length) {
          setDuplicateHint(
            `Similar player exists: ${body.similar.map((s: { full_name: string }) => s.full_name).join(", ")}`,
          );
        }
        throw new Error(body.message || body.error || "Could not save player");
      }
      const saved = body.player as Player;
      setPlayers((prev) => {
        const idx = prev.findIndex((p) => p.id === saved.id);
        const sortPlayers = (list: Player[]) =>
          [...list].sort((a, b) => {
            const ja = a.jersey_number ?? 9999;
            const jb = b.jersey_number ?? 9999;
            if (ja !== jb) return ja - jb;
            return a.full_name.localeCompare(b.full_name);
          });
        if (idx === -1) return sortPlayers([...prev, saved]);
        const next = [...prev];
        next[idx] = saved;
        return sortPlayers(next);
      });
      setMode(null);
      setEditing(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Save failed");
    } finally {
      setFormBusy(false);
    }
  }

  async function toggleActive(player: Player) {
    if (!isAdmin || statusBusyId) return;
    setStatusBusyId(player.id);
    setError(null);
    try {
      const res = await fetch(`/api/admin/players/${player.id}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ is_active: !player.is_active }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(body.error || "Status update failed");
      const saved = body.player as Player;
      setPlayers((prev) =>
        prev.map((p) => (p.id === saved.id ? saved : p)),
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "Update failed");
    } finally {
      setStatusBusyId(null);
    }
  }

  return (
    <div className="space-y-6 rw-animate-in">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Official Squad</h1>
          <p className="mt-1 text-sm text-[var(--rw-muted)]">
            Persistent player IDs for every Red Wings squad member. Guest match
            players will be added during match setup in a later phase.
          </p>
        </div>
        {isAdmin ? (
          <button
            type="button"
            onClick={openCreate}
            className="rw-focus-ring rw-btn-primary"
          >
            Add player
          </button>
        ) : null}
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <label className="flex-1">
          <span className="sr-only">Search squad</span>
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search by name or jersey number"
            className="rw-input w-full"
          />
        </label>
        <label className="inline-flex min-h-11 items-center gap-2 text-sm text-[var(--rw-muted)]">
          <input
            type="checkbox"
            checked={showInactive}
            onChange={(e) => setShowInactive(e.target.checked)}
            className="h-4 w-4 rounded border-[var(--rw-border)]"
          />
          Show inactive
        </label>
      </div>

      {error ? <ErrorState message={error} /> : null}

      {mode ? (
        <form
          onSubmit={submitForm}
          className="rw-card p-5 sm:p-6"
        >
          <h2 className="text-lg font-semibold">
            {mode === "edit" ? "Edit player" : "Add player"}
          </h2>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <label className="block text-sm">
              <span className="mb-1 block font-medium">Full name</span>
              <input
                required
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                className="rw-input w-full"
              />
            </label>
            <label className="block text-sm">
              <span className="mb-1 block font-medium">
                Jersey number <span className="font-normal text-[var(--rw-muted)]">(optional)</span>
              </span>
              <input
                inputMode="numeric"
                value={jersey}
                onChange={(e) => setJersey(e.target.value.replace(/\D/g, ""))}
                className="rw-input w-full"
                placeholder="Optional"
              />
            </label>
          </div>
          {duplicateHint ? (
            <p className="mt-3 text-sm text-amber-600 dark:text-amber-400">
              {duplicateHint}
            </p>
          ) : null}
          <div className="mt-5 flex flex-wrap gap-2">
            <button
              type="submit"
              disabled={formBusy}
              className="rw-focus-ring rw-btn-primary disabled:opacity-60"
            >
              {formBusy ? "Saving…" : "Save"}
            </button>
            <button
              type="button"
              onClick={() => setMode(null)}
              className="rw-focus-ring rw-btn-secondary"
            >
              Cancel
            </button>
          </div>
        </form>
      ) : null}

      {filtered.length === 0 ? (
        <EmptyState
          title="No players added yet"
          description={
            isAdmin
              ? "Add your first Red Wings squad member to get started."
              : "The official squad list will appear here once admins add players."
          }
          actionLabel={isAdmin ? "Add player" : undefined}
          actionHref={isAdmin ? undefined : undefined}
        />
      ) : (
        <ul className="grid gap-3 sm:grid-cols-2">
          {filtered.map((player) => (
            <li
              key={player.id}
              className="rw-card rw-card-interactive flex flex-col gap-4 p-4 sm:p-5"
            >
              <div className="min-w-0">
                <div className="flex items-start gap-3">
                  <span className="inline-flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-red-500/15 to-red-500/5 text-lg font-extrabold text-[var(--rw-primary)] shadow-sm">
                    {player.jersey_number ?? "—"}
                  </span>
                  <div className="min-w-0">
                    <Link
                      href={`/players/${player.id}`}
                      className="rw-focus-ring truncate font-semibold hover:underline"
                    >
                      {player.full_name}
                    </Link>
                    <p className="text-xs text-[var(--rw-muted)]">
                      ID {player.id.slice(0, 8)}…
                    </p>
                    {!player.is_active ? (
                      <span className="mt-1 inline-flex rounded-full border border-amber-500/30 bg-amber-500/10 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-amber-700 dark:text-amber-400">
                        Inactive
                      </span>
                    ) : null}
                  </div>
                </div>
              </div>
              {isAdmin ? (
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => openEdit(player)}
                    className="rw-focus-ring rw-btn-secondary px-4 py-2 text-xs"
                  >
                    Edit
                  </button>
                  <button
                    type="button"
                    disabled={statusBusyId === player.id}
                    onClick={() => toggleActive(player)}
                    className="rw-focus-ring rw-btn-secondary px-4 py-2 text-xs disabled:opacity-60"
                  >
                    {statusBusyId === player.id
                      ? "Updating…"
                      : player.is_active
                        ? "Deactivate"
                        : "Reactivate"}
                  </button>
                </div>
              ) : null}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
