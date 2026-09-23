"use client";

import { useParams, useRouter } from "next/navigation";
import { PageBackAnchor, SmartBackButton } from "@/components/ui/back-button";
import { ScorerEntryGuard } from "@/components/live/scorer-entry-guard";
import { ScoringControlPanel } from "@/components/scoring/scoring-control-panel";
import { useScoringSessionStatus } from "@/lib/scoring/use-scoring-session-status";
import { rememberScorerPinForSlug } from "@/lib/scoring/scorer-pin-client";
import { useEffect, useState } from "react";

function EnterPinForm({ matchId }: { matchId: string | null }) {
  const params = useParams<{ slug: string }>();
  const router = useRouter();
  const session = useScoringSessionStatus(params.slug, matchId ?? "");
  const [pin, setPin] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [resolvedMatchId, setResolvedMatchId] = useState<string | null>(matchId);

  useEffect(() => {
    if (matchId) return;
    void (async () => {
      const res = await fetch(
        `/api/public/match-by-slug?slug=${encodeURIComponent(params.slug)}`,
      );
      const body = await res.json().catch(() => ({}));
      if (res.ok && body.match?.id) setResolvedMatchId(body.match.id);
    })();
  }, [matchId, params.slug]);

  const effectiveMatchId = resolvedMatchId ?? matchId;

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!effectiveMatchId) {
      setError("Match not found.");
      return;
    }
    setLoading(true);
    setError(null);

    const res = await fetch("/api/scoring/verify-pin", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({
        match_id: effectiveMatchId,
        pin,
      }),
    });
    const body = await res.json().catch(() => ({}));
    setLoading(false);

    if (res.status === 401) {
      setError("Incorrect scorer PIN");
      return;
    }
    if (!res.ok) {
      setError("Could not start scoring session.");
      return;
    }

    rememberScorerPinForSlug(params.slug, pin);
    await session.refresh();

    if (body.scoring_role === "controller") {
      router.push(`/live/${params.slug}/score`);
      return;
    }

    router.push(`/live/${params.slug}/score`);
  }

  return (
    <>
      <h1 className="text-xl font-bold">Enter as Scorer</h1>
      <p className="mt-1 text-sm text-[var(--rw-muted)]">
        Enter the 4-digit scorer PIN for this match.
      </p>

      {effectiveMatchId && session.has_active_controller && !session.authorized ? (
        <p className="mt-4 rounded-xl border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-xs text-[var(--rw-muted)]">
          Another device may be scoring this match. After you enter the PIN, you
          can request control from that device.
        </p>
      ) : null}

      {effectiveMatchId ? (
        <div className="mt-4">
          <ScoringControlPanel
            slug={params.slug}
            session={session}
            context="enter-pin"
          />
        </div>
      ) : null}

      <form onSubmit={onSubmit} className="mt-6 space-y-4">
        <label className="block text-sm">
          <span className="mb-1 block font-medium">Scorer PIN</span>
          <input
            inputMode="numeric"
            pattern="\d{4}"
            maxLength={4}
            required
            value={pin}
            onChange={(e) => setPin(e.target.value.replace(/\D/g, "").slice(0, 4))}
            className="rw-input w-full text-center text-2xl tracking-[0.5em]"
            autoComplete="off"
          />
        </label>
        {error ? (
          <p className="text-sm text-red-600" role="alert">
            {error}
          </p>
        ) : null}
        <button
          type="submit"
          disabled={loading || pin.length !== 4 || !effectiveMatchId}
          className="rw-focus-ring min-h-11 w-full rounded-full bg-[var(--rw-primary)] font-semibold text-white disabled:opacity-50"
        >
          {loading ? "Verifying…" : "Start Scoring"}
        </button>
      </form>
    </>
  );
}

export default function EnterPinPage() {
  const params = useParams<{ slug: string }>();

  return (
    <main className="mx-auto max-w-md space-y-6 p-6">
      <PageBackAnchor>
        <SmartBackButton fallbackHref={`/live/${params.slug}`} />
      </PageBackAnchor>
      <ScorerEntryGuard slug={params.slug}>
        <EnterPinForm matchId={null} />
      </ScorerEntryGuard>
    </main>
  );
}
