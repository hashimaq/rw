import Link from "next/link";
import { EmptyState } from "@/components/ui/empty-state";
import type { Player } from "@/lib/database/types";
import { getOfficialPlayers } from "@/lib/data/players";

export const metadata = { title: "Player Profiles" };

export default async function PlayersIndexPage() {
  let players: Player[] = [];
  try {
    players = await getOfficialPlayers(false);
  } catch {
    return (
      <EmptyState
        title="Could not load players"
        description="Please try again later."
      />
    );
  }

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-bold tracking-tight">Player Profiles</h1>
        <p className="mt-1 text-sm text-[var(--rw-muted)]">
          Each profile is keyed by persistent player ID — never by name alone.
        </p>
      </header>
      {players.length === 0 ? (
        <EmptyState
          title="No players yet"
          description="Official squad players will appear here once added."
          actionLabel="Manage squad"
          actionHref="/squad"
        />
      ) : (
        <ul className="grid gap-3 sm:grid-cols-2">
          {players.map((player) => (
            <li key={player.id}>
              <Link
                href={`/players/${player.id}`}
                className="rw-focus-ring block rounded-2xl border border-[var(--rw-border)] bg-[var(--rw-surface)] p-4"
              >
                <p className="font-semibold">{player.full_name}</p>
                <p className="text-sm text-[var(--rw-muted)]">
                  #{player.jersey_number}
                </p>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
