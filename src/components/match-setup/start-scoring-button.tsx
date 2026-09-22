"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { cn } from "@/lib/utils/cn";

interface StartScoringButtonProps {
  matchId: string;
  shareSlug: string;
  matchStatus: string;
  className?: string;
  /** When true and user is admin, may bootstrap scoring session without PIN (setup only). */
  allowAdminBootstrap?: boolean;
}

/**
 * Match Ready: continues setup → live via PIN or admin bootstrap.
 * Does not skip straight to the scoring screen without authorization.
 */
export function StartScoringButton({
  matchId,
  shareSlug,
  matchStatus,
  className,
  allowAdminBootstrap = false,
}: StartScoringButtonProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onStart() {
    if (loading) return;
    setLoading(true);
    setError(null);

    try {
      if (matchStatus === "live") {
        router.push(`/live/${shareSlug}`);
        return;
      }

      if (allowAdminBootstrap && matchStatus === "setup") {
        const res = await fetch("/api/scoring/start-session", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({ match_id: matchId }),
        });
        const body = await res.json().catch(() => ({}));

        if (res.ok) {
          router.push(`/live/${shareSlug}/enter-pin`);
          return;
        }
        if (res.status === 409 && body.error === "controller_active_elsewhere") {
          router.push(`/live/${shareSlug}`);
          return;
        }
      }

      router.push(`/live/${shareSlug}/enter-pin`);
    } catch {
      setError("Could not open scoring. Try again.");
      setLoading(false);
    }
  }

  return (
    <div className={cn("flex flex-col gap-2", className)}>
      <button
        type="button"
        disabled={loading}
        onClick={() => void onStart()}
        className="rw-focus-ring rw-btn-primary w-full text-center disabled:opacity-60"
      >
        {loading ? "Opening…" : "Start Scoring"}
      </button>
      {error ? (
        <p className="text-center text-sm text-red-600" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}
