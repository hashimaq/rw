import Link from "next/link";
import { EmptyState } from "@/components/ui/empty-state";
import { fetchCareerStatisticsSnapshot } from "@/lib/data/career-statistics";
import { getOfficialPlayers } from "@/lib/data/players";
import { buildRecordsFromCareerSnapshot } from "@/lib/statistics/records-from-snapshot";

export const metadata = { title: "Records" };

export default async function RecordsPage() {
  let failed = false;
  let records: ReturnType<typeof buildRecordsFromCareerSnapshot> = [];

  try {
    const [players, snapshot] = await Promise.all([
      getOfficialPlayers(false),
      fetchCareerStatisticsSnapshot(),
    ]);
    records = buildRecordsFromCareerSnapshot(snapshot, players);
  } catch {
    failed = true;
  }

  return (
    <div className="min-w-0 space-y-6">
      <header className="min-w-0">
        <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">Records</h1>
        <p className="mt-1 text-sm text-[var(--rw-muted)]">
          Completed public matches only — same career snapshot as Stats and Player Profiles.
        </p>
      </header>

      {failed ? (
        <EmptyState
          title="Could not load records"
          description="Please try again in a moment."
        />
      ) : records.length === 0 ? (
        <EmptyState
          title="No records yet"
          description="Complete a match to establish record holders from real ball-by-ball data."
          actionLabel="Scorecards"
          actionHref="/scorecards"
        />
      ) : (
        <ul className="divide-y divide-[var(--rw-border)] rounded-2xl border border-[var(--rw-border)] bg-[var(--rw-surface)]">
          {records.map((row) => (
            <li
              key={row.id}
              className="flex min-w-0 flex-col gap-2 px-4 py-4 sm:flex-row sm:items-center sm:justify-between"
            >
              <div className="min-w-0">
                <p className="text-xs font-semibold uppercase tracking-wide text-[var(--rw-muted)]">
                  {row.label}
                </p>
                <p className="mt-1 truncate text-lg font-semibold">
                  {row.playerId ? (
                    <Link
                      href={`/players/${row.playerId}`}
                      prefetch
                      className="rw-focus-ring text-[var(--rw-primary)] hover:underline"
                    >
                      {row.playerName}
                    </Link>
                  ) : (
                    row.playerName
                  )}
                </p>
                {row.context ? (
                  <p className="mt-0.5 truncate text-xs text-[var(--rw-muted)]">
                    {row.context}
                  </p>
                ) : null}
              </div>
              <p className="shrink-0 text-2xl font-bold tabular-nums text-[var(--rw-text)]">
                {row.value}
              </p>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
