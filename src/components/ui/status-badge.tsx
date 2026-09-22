import { cn } from "@/lib/utils/cn";

const styles: Record<string, string> = {
  live: "border-red-500/30 bg-red-500/10 text-red-600 dark:text-red-400",
  completed: "border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400",
  setup: "border-slate-500/30 bg-slate-500/10 text-slate-700 dark:text-slate-300",
  abandoned: "border-amber-500/30 bg-amber-500/10 text-amber-800 dark:text-amber-400",
};

export function StatusBadge({ status }: { status: string }) {
  const key = status.toLowerCase();
  return (
    <span
      className={cn(
        "inline-flex rounded-full border px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-wide",
        styles[key] ?? styles.setup,
      )}
    >
      {status === "setup" ? "ready" : status.replaceAll("_", " ")}
    </span>
  );
}
