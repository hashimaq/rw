import Link from "next/link";
import { cn } from "@/lib/utils/cn";

interface PlayerStatLinkProps {
  playerId: string;
  children: React.ReactNode;
  className?: string;
}

export function PlayerStatLink({ playerId, children, className }: PlayerStatLinkProps) {
  return (
    <Link
      href={`/players/${playerId}`}
      prefetch
      className={cn(
        "rw-focus-ring font-semibold text-[var(--rw-primary)] hover:underline",
        className,
      )}
    >
      {children}
    </Link>
  );
}
