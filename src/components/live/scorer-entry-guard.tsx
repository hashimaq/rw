"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";

interface ScorerEntryGuardProps {
  slug: string;
  children: ReactNode;
}

/** Skip PIN form when this browser already has a valid scorer session. */
export function ScorerEntryGuard({ slug, children }: ScorerEntryGuardProps) {
  const router = useRouter();
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(
          `/api/scoring/session-status?slug=${encodeURIComponent(slug)}`,
          { credentials: "include" },
        );
        const body = await res.json().catch(() => ({}));
        if (!cancelled && res.ok && body.authorized) {
          router.replace(`/live/${slug}/score`);
          return;
        }
      } catch {
        /* show form */
      }
      if (!cancelled) setReady(true);
    })();
    return () => {
      cancelled = true;
    };
  }, [slug, router]);

  if (!ready) {
    return (
      <p className="text-sm text-[var(--rw-muted)]" aria-live="polite">
        Checking scorer session…
      </p>
    );
  }

  return <>{children}</>;
}
