import { PageSection } from "@/components/layout/page-section";
import { EmptyState } from "@/components/ui/empty-state";
import { LiveMatchCard } from "@/components/live/live-match-card";
import { fetchLiveMatches } from "@/lib/data/matches";
import type { Match } from "@/lib/database/types";

export const metadata = { title: "Live" };

export default async function LiveHubPage() {
  let liveMatches: Match[] = [];
  let failed = false;
  try {
    liveMatches = await fetchLiveMatches();
  } catch {
    failed = true;
  }

  return (
    <div className="space-y-6 rw-animate-in">
      <header>
        <h1 className="text-2xl font-bold tracking-tight">Live Matches</h1>
      </header>

      <PageSection title="Live now">
        {failed ? (
          <EmptyState
            title="Could not load live matches"
            description="Please refresh and try again."
          />
        ) : liveMatches.length === 0 ? (
          <EmptyState
            title="No live match right now"
            description="There is no active live match in the database."
            actionLabel="View all matches"
            actionHref="/matches"
          />
        ) : (
          <ul className="grid gap-4">
            {liveMatches.map((match) => (
              <li key={match.id}>
                <LiveMatchCard match={match} featured />
              </li>
            ))}
          </ul>
        )}
      </PageSection>
    </div>
  );
}
