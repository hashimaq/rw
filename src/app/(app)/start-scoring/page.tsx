import Link from "next/link";
import { PageBackAnchor, SmartBackButton } from "@/components/ui/back-button";
import { EmptyState } from "@/components/ui/empty-state";
import { MatchCard } from "@/components/ui/match-card";
import { RwButton } from "@/components/ui/rw-button";
import { fetchScorableMatches } from "@/lib/data/matches";

export const metadata = { title: "Start Scoring" };

export default async function StartScoringPage() {
  let matches: Awaited<ReturnType<typeof fetchScorableMatches>> = [];
  let failed = false;

  try {
    matches = await fetchScorableMatches();
  } catch {
    failed = true;
  }

  return (
    <div className="mx-auto max-w-lg space-y-6 rw-animate-in">
      <PageBackAnchor>
        <SmartBackButton fallbackHref="/" />
      </PageBackAnchor>

      <header className="flex flex-wrap items-end justify-between gap-3">
        <h1 className="text-2xl font-bold tracking-tight">Start Scoring</h1>
        <RwButton href="/matches/setup" className="text-sm">
          Create Match
        </RwButton>
      </header>

      {failed ? (
        <EmptyState
          title="Could not load matches"
          description="Please try again."
          actionLabel="Back to home"
          actionHref="/"
          actionVariant="back"
        />
      ) : matches.length === 0 ? (
        <EmptyState
          title="No matches yet"
          description="Create a new match to begin."
          actionLabel="Create Match"
          actionHref="/matches/setup"
        />
      ) : (
        <ul className="grid gap-3">
          {matches.map((match) => (
            <li key={match.id}>
              <MatchCard
                match={match}
                live={match.status === "live"}
                href={
                  match.status === "setup"
                    ? `/matches/setup/ready?matchId=${match.id}`
                    : match.share_slug
                      ? `/live/${match.share_slug}`
                      : undefined
                }
              />
            </li>
          ))}
        </ul>
      )}

      {matches.length > 0 ? (
        <p className="text-center">
          <Link
            href="/matches/setup"
            className="text-sm font-semibold text-[var(--rw-primary)] hover:underline"
          >
            Create Match
          </Link>
        </p>
      ) : null}
    </div>
  );
}
