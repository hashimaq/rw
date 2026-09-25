import { notFound } from "next/navigation";
import { CareerStatGrid } from "@/components/statistics/career-stat-grid";
import { PlayerRecentPerformances } from "@/components/statistics/player-recent-performances";
import { PageBackAnchor, SmartBackButton } from "@/components/ui/back-button";
import { EmptyState } from "@/components/ui/empty-state";
import {
  getPlayerCareerStats,
  getPlayerRecentPerformances,
} from "@/lib/data/career-statistics";
import { getPlayerById } from "@/lib/data/players";

interface PageProps {
  params: Promise<{ id: string }>;
}

export async function generateMetadata({ params }: PageProps) {
  const { id } = await params;
  const player = await getPlayerById(id);
  return { title: player?.full_name ?? "Player" };
}

export default async function PlayerProfilePage({ params }: PageProps) {
  const { id } = await params;

  const [player, stats, recent] = await Promise.all([
    getPlayerById(id),
    getPlayerCareerStats(id),
    getPlayerRecentPerformances(id),
  ]);

  if (!player) notFound();

  const meta: string[] = [];
  if (player.jersey_number != null) meta.push(`Jersey #${player.jersey_number}`);
  if (player.role) meta.push(player.role);
  if (player.batting_style) meta.push(player.batting_style);
  if (player.bowling_style) meta.push(player.bowling_style);

  return (
    <div className="min-w-0 space-y-8">
      <div className="min-w-0">
        <PageBackAnchor className="mb-3">
          <SmartBackButton
            fallbackHref="/players"
            ariaLabel="Go back to player profiles"
          />
        </PageBackAnchor>
        <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
          {player.full_name}
        </h1>
        {meta.length > 0 ? (
          <p className="mt-1 text-sm text-[var(--rw-muted)]">{meta.join(" · ")}</p>
        ) : null}
      </div>

      <section className="min-w-0 rounded-2xl border border-[var(--rw-border)] bg-[var(--rw-surface)] p-5">
        <h2 className="text-lg font-semibold">Career statistics</h2>
        <p className="mt-1 text-sm text-[var(--rw-muted)]">
          Completed matches only. Batting averages exclude not-out innings.
        </p>
        <div className="mt-4">
          <CareerStatGrid stats={stats} variant="full" />
        </div>
      </section>

      {stats.matches === 0 ? (
        <EmptyState
          title="No match statistics yet"
          description="This player has no completed match contributions recorded."
        />
      ) : (
        <PlayerRecentPerformances performances={recent} />
      )}
    </div>
  );
}
