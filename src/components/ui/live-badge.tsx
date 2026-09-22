export function LiveBadge({ label = "LIVE" }: { label?: string }) {
  return (
    <span className="inline-flex items-center gap-2 rounded-full border border-red-500/30 bg-red-500/10 px-2.5 py-1 text-[11px] font-bold tracking-wider text-red-600 dark:text-red-400">
      <span className="rw-live-dot inline-block h-2 w-2 rounded-full bg-red-500" aria-hidden />
      {label}
    </span>
  );
}
