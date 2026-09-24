/** Instant shell feedback during client navigations between app routes. */
export default function AppRouteLoading() {
  return (
    <div className="space-y-6 rw-animate-in" aria-busy="true" aria-label="Loading page">
      <div className="h-8 w-48 max-w-full rounded-lg bg-[var(--rw-surface-hover)]" />
      <div className="space-y-3">
        <div className="h-24 rounded-2xl bg-[var(--rw-surface-hover)]" />
        <div className="h-24 rounded-2xl bg-[var(--rw-surface-hover)]" />
      </div>
    </div>
  );
}
