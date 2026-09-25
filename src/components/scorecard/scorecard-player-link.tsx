import Link from "next/link";
import { cn } from "@/lib/utils/cn";

interface ScorecardPlayerLinkProps {
  playerId: string | null | undefined;
  children: React.ReactNode;
  className?: string;
}

/** Profile link when a stable player id exists; plain text otherwise (opponents without ids). */
export function ScorecardPlayerLink({
  playerId,
  children,
  className,
}: ScorecardPlayerLinkProps) {
  const id = playerId?.trim();
  if (!id) {
    return <span className={className}>{children}</span>;
  }
  return (
    <Link
      href={`/players/${id}`}
      prefetch
      className={cn(
        "rw-focus-ring text-inherit hover:text-[var(--rw-primary)] hover:underline",
        className,
      )}
    >
      {children}
    </Link>
  );
}
