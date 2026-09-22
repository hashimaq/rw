import { cn } from "@/lib/utils/cn";

interface AdminRoleBadgeProps {
  label: string;
  superAdmin?: boolean;
  className?: string;
}

export function AdminRoleBadge({
  label,
  superAdmin = false,
  className,
}: AdminRoleBadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wide",
        superAdmin
          ? "bg-amber-500/15 text-amber-800 dark:text-amber-200"
          : "bg-[var(--rw-primary)]/10 text-[var(--rw-primary)]",
        className,
      )}
    >
      {label}
    </span>
  );
}
