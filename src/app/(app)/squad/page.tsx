import { SquadManager } from "@/components/squad/squad-manager";
import { EmptyState } from "@/components/ui/empty-state";
import { getServerSession } from "@/lib/auth/server-session";
import type { Player } from "@/lib/database/types";
import { getOfficialPlayers } from "@/lib/data/players";

export const metadata = { title: "Squad" };

export default async function SquadPage() {
  let admin = false;
  let players: Player[] = [];
  let failed = false;
  try {
    const [session, rows] = await Promise.all([
      getServerSession(),
      getOfficialPlayers(true),
    ]);
    admin = session.admin;
    players = rows;
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
