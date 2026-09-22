import Link from "next/link";
import { EmptyState } from "@/components/ui/empty-state";
import { fetchAllMatches } from "@/lib/data/matches";
import type { Match } from "@/lib/database/types";
import { scorecardHrefFromArchive } from "@/lib/data/completed-scorecard-list-format";

export const metadata = { title: "Match History" };

export default async function HistoryPage() {
  let matches: Match[] = [];
  try {
    matches = await fetchAllMatches();
  } catch {
    return (
      <EmptyState
        title="Could not load history"
        description="Please try again later."
      />
    );
  }

  const completed = matches.filter((m) => m.status === "completed");

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold tracking-tight">Match History</h1>
      {completed.length === 0 ? (
        <EmptyState
          title="No completed matches yet"
          description="Completed match history will appear here from real database records."
          actionLabel="View matches"
          actionHref="/matches"
        />
      ) : (
        <ul className="divide-y divide-[var(--rw-border)] rounded-2xl border border-[var(--rw-border)] bg-[var(--rw-surface)]">
          {completed.map((match) => (
            <li key={match.id} className="px-4 py-4">
              <p className="font-semibold">
                {match.match_number} vs {match.opponent_name}
              </p>
              <p className="text-sm text-[var(--rw-muted)]">
                {match.match_date ?? "—"}
              </p>
              {match.share_slug ? (
                <Link
                  href={scorecardHrefFromArchive(match.share_slug)}
                  className="rw-focus-ring mt-2 inline-block text-sm font-semibold text-[var(--rw-primary)]"
                >
                  View scorecard
                </Link>
              ) : null}
            </li>
          ))}
        </ul>
      )}
      <Link href="/matches" className="text-sm font-medium text-[var(--rw-primary)]">
        All matches
      </Link>
    </div>
  );
}
