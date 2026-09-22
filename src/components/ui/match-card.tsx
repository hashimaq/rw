import Link from "next/link";
import type { Match } from "@/lib/database/types";
import { LiveBadge } from "@/components/ui/live-badge";
import { StatusBadge } from "@/components/ui/status-badge";
import { cn } from "@/lib/utils/cn";

interface MatchCardProps {
  match: Match;
  href?: string;
  live?: boolean;
  /** Top-right slot (e.g. options menu). When set, the card is not a single full-card link. */
  headerAction?: React.ReactNode;
}

export function MatchCard({ match, href, live, headerAction }: MatchCardProps) {
  const content = (
    <>
      <div className="flex items-start gap-2">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            {live || match.status === "live" ? <LiveBadge /> : null}
            <StatusBadge status={match.status} />
            <span className="text-xs font-semibold text-[var(--rw-muted)]">
              {match.match_number}
            </span>
          </div>
        </div>
        {headerAction}
      </div>
      <p className="mt-3 text-lg font-bold tracking-tight">
        Red Wings <span className="text-[var(--rw-muted)]">vs</span>{" "}
        {match.opponent_name}
      </p>
      <p className="mt-1 text-sm text-[var(--rw-muted)]">
        {match.match_date ?? "Date TBC"}
        {match.result ? ` · ${match.result.replaceAll("_", " ")}` : ""}
      </p>
    </>
  );

  const className = cn(
    "rw-card rw-card-interactive block p-5",
    (live || match.status === "live") &&
      "border-red-500/25 bg-gradient-to-br from-red-500/5 to-[var(--rw-surface)]",
  );

  if (href && !headerAction) {
    return (
      <Link href={href} className={cn(className, "rw-focus-ring")}>
        {content}
      </Link>
    );
  }

  return <div className={className}>{content}</div>;
}
