"use client";

import { useParams, useRouter } from "next/navigation";
import { PageBackAnchor, SmartBackButton } from "@/components/ui/back-button";
import { ScorerEntryGuard } from "@/components/live/scorer-entry-guard";
import { rememberScorerPinForSlug } from "@/lib/scoring/scorer-pin-client";
import { useState } from "react";

function EnterPinForm() {
  const params = useParams<{ slug: string }>();
  const router = useRouter();
  const [pin, setPin] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const matchRes = await fetch(`/api/public/match-by-slug?slug=${params.slug}`);
    const matchBody = await matchRes.json().catch(() => ({}));
    if (!matchRes.ok || !matchBody.match?.id) {
      setError("Match not found.");
      setLoading(false);
      return;
    }

    const res = await fetch("/api/scoring/verify-pin", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({
        match_id: matchBody.match.id,
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
    router.push(`/live/${params.slug}/score`);
    return;
  }

  return (
    <>
      <h1 className="text-xl font-bold">Enter as Scorer</h1>
      <p className="mt-1 text-sm text-[var(--rw-muted)]">
        Enter the 4-digit scorer PIN for this match.
      </p>
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
          disabled={loading || pin.length !== 4}
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
        <EnterPinForm />
      </ScorerEntryGuard>
    </main>
  );
}
