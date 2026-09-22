import { notFound } from "next/navigation";
import { PageBackAnchor, SmartBackButton } from "@/components/ui/back-button";
import { EmptyState } from "@/components/ui/empty-state";
import { emptyPlayerCareerStats } from "@/lib/statistics/player-career";
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
  const player = await getPlayerById(id);
  if (!player) notFound();

  const stats = emptyPlayerCareerStats(player.id);

  return (
    <div className="space-y-8">
      <div>
        <PageBackAnchor className="mb-3">
          <SmartBackButton
            fallbackHref="/players"
            ariaLabel="Go back to player profiles"
          />
        </PageBackAnchor>
        <h1 className="text-3xl font-bold tracking-tight">{player.full_name}</h1>
        <p className="mt-1 text-sm text-[var(--rw-muted)]">
          {player.jersey_number != null ? `Jersey #${player.jersey_number} · ` : ""}
          ID {player.id}
        </p>
      </div>

      <section className="rounded-2xl border border-[var(--rw-border)] bg-[var(--rw-surface)] p-5">
        <h2 className="text-lg font-semibold">Career statistics</h2>
        <p className="mt-1 text-sm text-[var(--rw-muted)]">
          Values update from completed match data only. No seeded stats.
        </p>
        <dl className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-4">
          {[
            ["Matches", stats.matches],
            ["Runs", stats.runs],
            ["Wickets", stats.wickets],
            ["Catches", stats.catches],
          ].map(([label, value]) => (
            <div key={label}>
              <dt className="text-xs text-[var(--rw-muted)]">{label}</dt>
              <dd className="text-xl font-semibold">{value}</dd>
            </div>
          ))}
        </dl>
      </section>

      {stats.matches === 0 ? (
        <EmptyState
          title="No match statistics yet"
          description="This player has no completed match contributions recorded."
        />
      ) : null}
    </div>
  );
}
