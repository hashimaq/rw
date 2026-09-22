import Link from "next/link";
import { primaryNav, secondaryNav } from "@/components/layout/nav-config";
import { cn } from "@/lib/utils/cn";

const explorePrimary = primaryNav.filter((item) => item.href !== "/");

const exploreItems = [...explorePrimary, ...secondaryNav];

interface HomeExploreMenuProps {
  isAdmin?: boolean;
  className?: string;
}

export function HomeExploreMenu({ isAdmin = false, className }: HomeExploreMenuProps) {
  return (
    <section
      className={cn(
        "rw-card space-y-4 border-[var(--rw-border)] p-5 sm:p-6",
        className,
      )}
      aria-labelledby="home-explore-heading"
    >
      <div>
        <h2 id="home-explore-heading" className="text-lg font-semibold tracking-tight">
          Menu &amp; Explore
        </h2>
        <p className="mt-1 text-sm text-[var(--rw-muted)]">
          Full Red Wings app — same destinations as the header menu (☰) and bottom tabs on
          mobile. Nothing is hidden while a match is live.
        </p>
      </div>

      <ul className="grid min-w-0 grid-cols-2 gap-2 sm:grid-cols-3">
        {exploreItems.map((item) => (
          <li key={item.href} className="min-w-0">
            <Link
              href={item.href}
              className="rw-focus-ring rw-card-interactive block truncate rounded-xl border border-[var(--rw-border)] bg-[var(--rw-surface-hover)]/40 px-3 py-3 text-sm font-semibold"
            >
              {item.label}
            </Link>
          </li>
        ))}
        {isAdmin ? (
          <li className="min-w-0">
            <Link
              href="/admin"
              className="rw-focus-ring rw-card-interactive block truncate rounded-xl border border-[var(--rw-primary)]/25 bg-red-500/5 px-3 py-3 text-sm font-semibold text-[var(--rw-primary)]"
            >
              Admin Dashboard
            </Link>
          </li>
        ) : null}
      </ul>
    </section>
  );
}
