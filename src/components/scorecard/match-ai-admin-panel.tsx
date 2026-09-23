"use client";

import { useState } from "react";

export function MatchAiAdminPanel({
  matchId,
  initialStatus,
}: {
  matchId: string;
  initialStatus: string | null;
}) {
  const [status, setStatus] = useState(initialStatus ?? "none");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const regenerate = async () => {
    setBusy(true);
    setMessage(null);
    try {
      const res = await fetch(`/api/admin/matches/${matchId}/ai-analysis`, {
        method: "POST",
        credentials: "include",
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(
          typeof body.error === "string" ? body.error : "Regeneration failed",
        );
      }
      setStatus("processing");
      setMessage("AI analysis regeneration started.");
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Regeneration failed");
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className="rounded-lg border border-dashed border-[var(--rw-border)] bg-[var(--rw-surface)] px-3 py-3 text-sm">
      <p className="font-semibold">AI Match Analysis (Admin)</p>
      <p className="mt-1 text-[var(--rw-muted)]">
        Status: {status === "none" ? "Not started" : status}
      </p>
      <button
        type="button"
        className="rw-focus-ring rw-btn-secondary mt-3 text-sm"
        disabled={busy}
        onClick={() => void regenerate()}
      >
        {busy ? "Starting…" : "Regenerate AI Analysis"}
      </button>
      {message ? (
        <p className="mt-2 text-[var(--rw-primary)]">{message}</p>
      ) : null}
    </section>
  );
}
