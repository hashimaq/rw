import { SquadManager } from "@/components/squad/squad-manager";
import { EmptyState } from "@/components/ui/empty-state";
import { getServerSession } from "@/lib/auth/server-session";
import type { Player } from "@/lib/database/types";
import { getOfficialPlayers } from "@/lib/data/players";

export const metadata = { title: "Squad" };

export default async function SquadPage() {
  const { admin } = await getServerSession();

  let players: Player[] = [];
  let failed = false;
  try {
    players = await getOfficialPlayers(true);
  } catch {
    failed = true;
  }

  if (failed) {
    return (
      <EmptyState
        title="Could not load squad"
        description="We could not fetch players right now. Please try again shortly."
      />
    );
  }

  return <SquadManager initialPlayers={players} isAdmin={admin} />;
}
