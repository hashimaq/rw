export function LoadingBlock({ label = "Loading…" }: { label?: string }) {
  return (
    <div
      className="rw-card flex min-h-32 items-center justify-center p-6"
      role="status"
      aria-live="polite"
    >
      <div className="flex w-full max-w-xs flex-col gap-3">
        <div className="h-3 animate-pulse rounded-full bg-[var(--rw-border)]" />
        <div className="h-3 w-4/5 animate-pulse rounded-full bg-[var(--rw-border)]" />
        <p className="pt-2 text-center text-sm text-[var(--rw-muted)]">{label}</p>
      </div>
    </div>
  );
}
