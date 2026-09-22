import { cn } from "@/lib/utils/cn";

/** Grey full-width bar matching professional broadcast scorecard section headers. */
export function ScorecardTemplateBar({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "border-y border-[var(--rw-border)] bg-[var(--rw-surface-hover)] px-3 py-2 text-[13px] font-semibold text-[var(--rw-text)] sm:px-4",
        className,
      )}
    >
      {children}
    </div>
  );
}
