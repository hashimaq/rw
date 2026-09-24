import Link from "next/link";
import { HomeExploreMenu } from "@/components/home/home-explore-menu";
import { HomeHero } from "@/components/home/home-hero";
import { PageSection } from "@/components/layout/page-section";
import { EmptyState } from "@/components/ui/empty-state";
import { LiveMatchCard } from "@/components/live/live-match-card";
import { MatchCard } from "@/components/ui/match-card";
import { getServerSession } from "@/lib/auth/server-session";
import { fetchHomeMatches } from "@/lib/data/matches";
import type { Match } from "@/lib/database/types";

export default async function HomePage() {
  let admin = false;
  let liveMatches: Match[] = [];
  let recentMatches: Match[] = [];
  let loadError = false;

  try {
    const [session, home] = await Promise.all([
      getServerSession(),
      fetchHomeMatches(),
    ]);
    admin = session.admin;
    liveMatches = home.live;
    recentMatches = home.recent;
  } catch {
    loadError = true;
  }

  const hasLive = liveMatches.length > 0;

  return (
    <div className="space-y-8 sm:space-y-10">
      <HomeHero compact={hasLive} />

      <PageSection
        title={hasLive ? "Live match" : "Live"}
        delayClass={hasLive ? "" : "rw-animate-in-delay-1"}
        className={hasLive ? "space-y-4" : undefined}
        action={
          <Link
            href="/live"
            className="text-sm font-semibold text-[var(--rw-primary)]"
          >
            Live hub
          </Link>
        }
      >
        {loadError ? (
          <EmptyState
            title="Could not load live matches"
            description="Check your connection and refresh the page."
          />
        ) : !hasLive ? (
          <EmptyState
            title="No live match right now"
            description="When scoring starts, the live match appears here with Watch Live and Enter as Scorer."
            actionLabel="View matches"
            actionHref="/matches"
          />
        ) : (
          <ul className="grid min-w-0 gap-4">
            {liveMatches.map((match) => (
              <li key={match.id} className="min-w-0">
                <LiveMatchCard match={match} featured />
              </li>
            ))}
          </ul>
        )}
      </PageSection>

      <HomeExploreMenu isAdmin={admin} />

      <PageSection title="Recent matches" delayClass="rw-animate-in-delay-2">
        {loadError ? null : recentMatches.length === 0 ? (
          <EmptyState
            title="Your first match will appear here"
            description="Completed and ready matches from Supabase show in this list — no placeholder data."
            actionLabel="Go to matches"
            actionHref="/matches"
          />
        ) : (
          <ul className="grid min-w-0 gap-3 sm:grid-cols-2">
            {recentMatches.map((match) => (
              <li key={match.id} className="min-w-0">
                <MatchCard
                  match={match}
                  live={match.status === "live"}
                  href={match.share_slug ? `/live/${match.share_slug}` : undefined}
                />
              </li>
            ))}
          </ul>
        )}
      </PageSection>
    </div>
  );
}
