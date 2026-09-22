import Link from "next/link";
import { RedWingsLogo } from "@/components/branding/red-wings-logo";
import { BackButton } from "@/components/ui/back-button";
import { cn } from "@/lib/utils/cn";

interface EmptyStateProps {
  title: string;
  description: string;
  actionLabel?: string;
  actionHref?: string;
  /** Use pill back control instead of primary CTA for navigation actions. */
  actionVariant?: "primary" | "back";
  className?: string;
  showLogo?: boolean;
}

export function EmptyState({
  title,
  description,
  actionLabel,
  actionHref,
  actionVariant = "primary",
  className,
  showLogo = true,
}: EmptyStateProps) {
  return (
    <div
      className={cn(
        "rw-card relative overflow-hidden px-6 py-12 text-center",
        className,
      )}
    >
      <div
        className="pointer-events-none absolute inset-0 opacity-40"
        aria-hidden
        style={{
          background:
            "radial-gradient(circle at 50% 0%, color-mix(in srgb, var(--rw-primary) 12%, transparent), transparent 55%)",
        }}
      />
      <div className="relative mx-auto max-w-sm">
        {showLogo ? (
          <div className="mb-5 flex justify-center opacity-90">
            <RedWingsLogo size={56} variant="square" />
          </div>
        ) : null}
        <h3 className="text-lg font-semibold tracking-tight text-[var(--rw-text)]">
          {title}
        </h3>
        <p className="mx-auto mt-2 text-sm leading-relaxed text-[var(--rw-muted)]">
          {description}
        </p>
        {actionLabel && actionHref ? (
          actionVariant === "back" ? (
            <div className="mt-6 flex justify-center">
              <BackButton href={actionHref} label={actionLabel} />
            </div>
          ) : (
            <Link href={actionHref} className="rw-focus-ring rw-btn-primary mt-6">
              {actionLabel}
            </Link>
          )
        ) : null}
      </div>
    </div>
  );
}
