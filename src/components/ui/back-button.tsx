"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils/cn";

function ChevronLeftIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden
    >
      <path
        d="M15 18l-6-6 6-6"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export interface BackButtonProps {
  href?: string;
  onClick?: () => void;
  /** Visible pill label (default "Back"). */
  label?: string;
  /** Accessible name; defaults to "Go back". */
  ariaLabel?: string;
  iconOnly?: boolean;
  disabled?: boolean;
  className?: string;
}

export function BackButton({
  href,
  onClick,
  label = "Back",
  ariaLabel,
  iconOnly = false,
  disabled = false,
  className,
}: BackButtonProps) {
  const resolvedAria =
    ariaLabel ?? (iconOnly ? label : "Go back");

  const content = (
    <>
      <ChevronLeftIcon className="h-4 w-4 shrink-0 opacity-90" />
      {!iconOnly ? <span className="truncate">{label}</span> : null}
    </>
  );

  const classes = cn(
    "rw-back-btn rw-focus-ring",
    iconOnly && "rw-back-btn-icon-only",
    className,
  );

  if (href && !disabled) {
    return (
      <Link href={href} className={classes} aria-label={resolvedAria}>
        {content}
      </Link>
    );
  }

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={classes}
      aria-label={resolvedAria}
    >
      {content}
    </button>
  );
}

/** Top-of-page alignment wrapper for back controls (avoids logo overlap). */
export function PageBackAnchor({
  className,
  children,
}: {
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div
      className={cn(
        "flex w-full min-w-0 shrink-0 justify-start self-start",
        className,
      )}
    >
      {children}
    </div>
  );
}

export interface SmartBackButtonProps {
  /** Used when there is no meaningful browser history to go back to. */
  fallbackHref?: string;
  label?: string;
  ariaLabel?: string;
  className?: string;
  disabled?: boolean;
}

function canMeaningfullyGoBackInApp(): boolean {
  if (typeof window === "undefined") return false;
  if (window.history.length <= 1) return false;
  const referrer = document.referrer;
  if (!referrer) return false;
  try {
    const ref = new URL(referrer);
    if (ref.origin !== window.location.origin) return false;
    const here = window.location.pathname + window.location.search;
    const there = ref.pathname + ref.search;
    return there !== here;
  } catch {
    return false;
  }
}

/** Browser back when there is a same-origin prior page; otherwise fallback (default Home). */
export function SmartBackButton({
  fallbackHref = "/",
  label = "Back",
  ariaLabel = "Go back",
  className,
  disabled = false,
}: SmartBackButtonProps) {
  const router = useRouter();

  function handleBack() {
    if (disabled) return;
    if (canMeaningfullyGoBackInApp()) {
      router.back();
      return;
    }
    router.push(fallbackHref);
  }

  return (
    <BackButton
      label={label}
      ariaLabel={ariaLabel}
      className={className}
      disabled={disabled}
      onClick={handleBack}
    />
  );
}
