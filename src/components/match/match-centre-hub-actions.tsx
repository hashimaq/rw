import Link from "next/link";
import { getMatchCentreHubActions } from "@/lib/match/match-centre-actions";
import type { MatchStatus } from "@/lib/database/types";
import { cn } from "@/lib/utils/cn";

export function MatchCentreHubActions({
  slug,
  status,
}: {
  slug: string;
  status: MatchStatus;
}) {
  const actions = getMatchCentreHubActions(status, slug);

  return (
    <div className="flex flex-col gap-3">
      {actions.map((action) => (
        <Link
          key={action.href + action.label}
          href={action.href}
          className={cn(
            "rw-focus-ring w-full text-center",
            action.variant === "primary" ? "rw-btn-primary" : "rw-btn-secondary",
          )}
        >
          {action.label}
        </Link>
      ))}
    </div>
  );
}
