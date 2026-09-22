import Link from "next/link";
import type { Match } from "@/lib/database/types";
import { LiveBadge } from "@/components/ui/live-badge";
import { cn } from "@/lib/utils/cn";

interface LiveMatchCardProps {
  match: Match;
  className?: string;
  /** When true, use hero-style prominence on home. */
  featured?: boolean;
}

export function LiveMatchCard({
  match,
  className,
  featured = false,
}: LiveMatchCardProps) {
  if (!match.share_slug) {
    return null;
  }

  const slug = match.share_slug;
  const base = `/live/${slug}`;

  return (
    <article
      className={cn(
        "rw-card overflow-hidden border-red-500/30 bg-gradient-to-br from-red-500/8 via-[var(--rw-surface)] to-[var(--rw-surface)] p-5 shadow-[var(--rw-shadow-md)]",
        featured && "ring-1 ring-red-500/20",
        className,
      )}
    >
      <div className="flex flex-wrap items-center gap-2">
        <LiveBadge />
        <span className="text-xs font-bold uppercase tracking-[0.18em] text-[var(--rw-muted)]">
          Live match
        </span>
      </div>

      <p className="mt-4 text-center text-xs font-bold tracking-[0.22em] text-[var(--rw-text)]">
        RED WINGS
      </p>
      <p className="mt-1 text-center text-lg font-bold">
        <span className="text-[var(--rw-muted)]">vs</span> {match.opponent_name}
      </p>
      <p className="mt-2 text-center text-sm tabular-nums text-[var(--rw-muted)]">
        {match.overs_limit} overs
        {match.match_number ? ` · ${match.match_number}` : ""}
      </p>
      <p className="mt-1 text-center text-2xl font-bold tabular-nums">—</p>
      <p className="text-center text-[10px] text-[var(--rw-muted)]">
        Score updates on Watch Live
      </p>

      <div className="mt-5 flex flex-col gap-2.5 sm:flex-row">
        <Link
          href={base}
          className="rw-focus-ring rw-btn-primary flex-1 text-center"
        >
          Open match
        </Link>
        <Link
          href={`${base}/enter-pin`}
          className="rw-focus-ring rw-btn-secondary flex-1 text-center"
        >
          Enter as Scorer
        </Link>
      </div>
    </article>
  );
}
