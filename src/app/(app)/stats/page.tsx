import Link from "next/link";
import { StatsLeaderboard } from "@/components/statistics/stats-leaderboard";
import { EmptyState } from "@/components/ui/empty-state";
import { fetchCareerStatisticsSnapshot } from "@/lib/data/career-statistics";
import { getOfficialPlayers } from "@/lib/data/players";
import type { Player } from "@/lib/database/types";
import type { PlayerCareerStats } from "@/lib/statistics/player-career";

export const metadata = { title: "Stats" };

export default async function StatsPage() {
  let players: Player[] = [];
  let snapshot = { statsByPlayerId: {}, recentByPlayerId: {} };
  let failed = false;

  try {
    [players, snapshot] = await Promise.all([
      getOfficialPlayers(false),
      fetchCareerStatisticsSnapshot(),
    ]);
  } catch {
    failed = true;
  }

  const hasAnyStats = (
    Object.values(snapshot.statsByPlayerId) as PlayerCareerStats[]
  ).some((s) => s.matches > 0 || s.runs > 0 || s.wickets > 0);

  return (
    <div className="min-w-0 space-y-8">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div className="min-w-0">
          <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">Stats</h1>
          <p className="mt-1 text-sm text-[var(--rw-muted)]">
            Career numbers from completed public matches — same engine as scorecards.
          </p>
        </div>
        <Link
          href="/players"
          prefetch
          className="rw-focus-ring shrink-0 text-sm font-semibold text-[var(--rw-primary)]"
        >
          Player profiles
        </Link>
      </header>

      {failed ? (
        <EmptyState
          title="Could not load statistics"
          description="Please try again in a moment."
        />
      ) : !hasAnyStats ? (
        <EmptyState
          title="No completed-match statistics yet"
          description="Finish and publish a match scorecard to populate leaderboards."
          actionLabel="Scorecards"
          actionHref="/scorecards"
        />
      ) : (
        <div className="grid min-w-0 gap-6 lg:grid-cols-2">
          <StatsLeaderboard
            title="Most runs"
            players={players}
            statsByPlayerId={snapshot.statsByPlayerId}
            metric="runs"
          />
          <StatsLeaderboard
            title="Most wickets"
            players={players}
            statsByPlayerId={snapshot.statsByPlayerId}
            metric="wickets"
          />
          <StatsLeaderboard
            title="Highest scores"
            players={players}
            statsByPlayerId={snapshot.statsByPlayerId}
            metric="highestScore"
            minQualification={{ innings: 1 }}
          />
          <StatsLeaderboard
            title="Strike rate (min 10 balls)"
            players={players}
            statsByPlayerId={snapshot.statsByPlayerId}
            metric="strikeRate"
            minQualification={{ legalBalls: 10 }}
          />
        </div>
      )}
    </div>
  );
}
