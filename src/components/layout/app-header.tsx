"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { RedWingsLogo, RedWingsWordmark } from "@/components/branding/red-wings-logo";
import { primaryNav, secondaryNav } from "@/components/layout/nav-config";
import { ThemeToggle } from "@/components/theme/theme-toggle";
import { cn } from "@/lib/utils/cn";

interface AppHeaderProps {
  isAdmin: boolean;
  isSignedIn: boolean;
}

export function AppHeader({ isAdmin, isSignedIn }: AppHeaderProps) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();

  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  const secondaryItems = isAdmin
    ? [{ href: "/admin", label: "Admin Dashboard" }, ...secondaryNav]
    : secondaryNav;

  return (
    <>
      <header className="sticky top-0 z-40 overflow-hidden border-b border-[var(--rw-border)] bg-[color-mix(in_srgb,var(--rw-bg)_88%,transparent)] backdrop-blur-xl">
        <div className="mx-auto flex h-[3.75rem] max-w-6xl items-center gap-3 px-4 sm:px-6">
          <Link href="/" className="rw-focus-ring flex min-w-0 shrink-0 items-center gap-2.5 sm:gap-3">
            <RedWingsLogo size={36} variant="header" priority />
            <span className="hidden min-w-0 sm:block">
              <RedWingsWordmark compact />
            </span>
          </Link>

          <nav
            className="ml-2 hidden flex-1 items-center gap-1 lg:flex"
            aria-label="Main"
          >
            {[...primaryNav, ...secondaryItems].map((item) => {
              const active =
                item.href === "/"
                  ? pathname === "/"
                  : pathname.startsWith(item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  prefetch
                  className={cn(
                    "rw-focus-ring rounded-full px-3 py-2 text-sm font-medium transition-colors",
                    active
                      ? "bg-[var(--rw-surface)] text-[var(--rw-primary)] shadow-sm"
                      : "text-[var(--rw-muted)] hover:bg-[var(--rw-surface)] hover:text-[var(--rw-text)]",
                  )}
                >
                  {item.label}
                </Link>
              );
            })}
          </nav>

          <div className="ml-auto flex items-center gap-2">
            <ThemeToggle />
            {isSignedIn ? (
              <Link
                href={isAdmin ? "/admin" : "/settings"}
                className="rw-focus-ring hidden min-h-10 items-center rounded-full border border-[var(--rw-border)] bg-[var(--rw-surface)] px-3 text-sm font-medium sm:inline-flex"
              >
                {isAdmin ? "Dashboard" : "Account"}
              </Link>
            ) : (
              <Link
                href="/login?next=/admin"
                className="rw-focus-ring hidden min-h-10 items-center rounded-full border border-[var(--rw-border)] bg-[var(--rw-surface)] px-3 text-xs font-medium text-[var(--rw-muted)] sm:inline-flex"
              >
                Admin
              </Link>
            )}
            <button
              type="button"
              className="rw-focus-ring inline-flex h-10 w-10 items-center justify-center rounded-full border border-[var(--rw-border)] bg-[var(--rw-surface)] lg:hidden"
              aria-label={open ? "Close menu" : "Open menu"}
              aria-expanded={open}
              onClick={() => setOpen((v) => !v)}
            >
              {open ? "✕" : "☰"}
            </button>
          </div>
        </div>
      </header>

      {open ? (
        <button
          type="button"
          aria-label="Close menu backdrop"
          className="fixed inset-0 z-40 bg-black/40 backdrop-blur-[2px] lg:hidden"
          onClick={() => setOpen(false)}
        />
      ) : null}

      {open ? (
        <div className="fixed inset-x-0 top-[3.75rem] z-50 mx-3 rw-drawer-panel lg:hidden">
          <div className="overflow-hidden rounded-2xl border border-[var(--rw-border)] bg-[var(--rw-surface)] shadow-[var(--rw-shadow-lg)]">
            <div className="border-b border-[var(--rw-border)] px-5 py-4">
              <div className="flex items-center gap-3">
                <RedWingsLogo size={36} variant="header" />
                <RedWingsWordmark compact />
              </div>
            </div>
            <nav className="grid gap-1 p-3" aria-label="Mobile menu">
              {[...primaryNav, ...secondaryItems].map((item) => {
                const active =
                  item.href === "/"
                    ? pathname === "/"
                    : pathname.startsWith(item.href);
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    prefetch
                    className={cn(
                      "rw-focus-ring rounded-xl px-4 py-3 text-sm font-medium transition-colors",
                      active
                        ? "bg-red-500/10 text-[var(--rw-primary)]"
                        : "text-[var(--rw-text)] hover:bg-[var(--rw-surface-hover)]",
                    )}
                    onClick={() => setOpen(false)}
                  >
                    {item.label}
                  </Link>
                );
              })}
              {!isSignedIn ? (
                <Link
                  href="/login?next=/admin"
                  className="rw-focus-ring rounded-xl border border-[var(--rw-border)] px-4 py-3 text-sm font-medium text-[var(--rw-muted)]"
                  onClick={() => setOpen(false)}
                >
                  Admin sign in
                </Link>
              ) : null}
            </nav>
          </div>
        </div>
      ) : null}
    </>
  );
}
