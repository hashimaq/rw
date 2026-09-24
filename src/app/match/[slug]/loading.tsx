/** Scorecard pages load large persisted datasets — show structure immediately. */
export default function MatchScorecardLoading() {
  return (
    <main className="rw-app-bg min-h-full text-[var(--rw-text)]">
      <div
        className="mx-auto min-w-0 max-w-3xl space-y-6 px-4 py-6 sm:px-6 sm:py-8"
        aria-busy="true"
        aria-label="Loading scorecard"
      >
        <div className="h-9 w-32 rounded-lg bg-[var(--rw-surface-hover)]" />
        <div className="h-10 rounded-xl bg-[var(--rw-surface-hover)]" />
        <div className="h-64 rounded-2xl bg-[var(--rw-surface-hover)]" />
      </div>
    </main>
  );
}
