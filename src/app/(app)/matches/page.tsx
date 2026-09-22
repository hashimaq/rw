import { AdminMatchListItem } from "@/components/admin/admin-match-list-item";
import { RwButton } from "@/components/ui/rw-button";
import { EmptyState } from "@/components/ui/empty-state";
import { getServerSession } from "@/lib/auth/server-session";
import { fetchAllMatches } from "@/lib/data/matches";
import type { Match } from "@/lib/database/types";

export const metadata = { title: "Matches" };

export default async function MatchesPage() {
  const { admin } = await getServerSession();
  let matches: Match[] = [];
  let failed = false;
  try {
    matches = await fetchAllMatches();
  } catch {
    failed = true;
  }

  return (
    <div className="space-y-6 rw-animate-in">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Matches</h1>
        </div>
        <RwButton href="/matches/setup">Create Match</RwButton>
      </header>

      {failed ? (
        <EmptyState
          title="Could not load matches"
          description="Please try again in a moment."
        />
      ) : matches.length === 0 ? (
        <EmptyState
          title="No matches yet"
          description="Create a match to get started."
          actionLabel="Create Match"
          actionHref="/matches/setup"
        />
      ) : (
        <ul className="grid gap-3 sm:grid-cols-2">
          {matches.map((match) => (
            <li key={match.id}>
              <AdminMatchListItem match={match} showAdminActions={admin} />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
