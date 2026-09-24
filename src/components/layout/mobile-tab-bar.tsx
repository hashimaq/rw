"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { NavIcon } from "@/components/layout/nav-icons";
import { primaryNav } from "@/components/layout/nav-config";
import { cn } from "@/lib/utils/cn";

function tabActive(pathname: string, href: string, pendingHref: string | null) {
  if (pendingHref === href) return true;
  if (href === "/") return pathname === "/";
  return pathname.startsWith(href);
}

export function MobileTabBar() {
  const pathname = usePathname();
  const [pendingHref, setPendingHref] = useState<string | null>(null);

  useEffect(() => {
    setPendingHref(null);
  }, [pathname]);

  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-40 border-t border-[var(--rw-border)] bg-[color-mix(in_srgb,var(--rw-bg)_90%,transparent)] pb-[env(safe-area-inset-bottom)] backdrop-blur-xl lg:hidden"
      aria-label="Primary"
    >
      <ul className="mx-auto grid max-w-lg grid-cols-4 px-1">
        {primaryNav.map((item) => {
          const active = tabActive(pathname, item.href, pendingHref);
          return (
            <li key={item.href}>
              <Link
                href={item.href}
                prefetch
                onClick={() => setPendingHref(item.href)}
                className={cn(
                  "rw-focus-ring relative flex min-h-[3.75rem] flex-col items-center justify-center gap-0.5 px-1 text-[10px] font-semibold uppercase tracking-wide",
                  active ? "text-[var(--rw-primary)]" : "text-[var(--rw-muted)]",
                )}
              >
                {active ? (
                  <span
                    className="absolute top-0 h-0.5 w-10 rounded-full bg-[var(--rw-primary)]"
                    aria-hidden
                  />
                ) : null}
                <span className={cn(active && "scale-110")}>
                  <NavIcon name={item.label} />
                </span>
                {item.shortLabel}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
