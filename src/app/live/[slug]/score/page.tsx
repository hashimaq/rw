import { createClient } from "@/lib/supabase/server";
import { LiveScoreScreen } from "@/components/live/live-score-screen";
import { loadScoringBootstrap } from "@/lib/data/scoring-bootstrap";

interface PageProps {
  params: Promise<{ slug: string }>;
}

export default async function PublicLiveScorePage({ params }: PageProps) {
  const { slug } = await params;
  const supabase = await createClient();

  const { data: match } = await supabase
    .from("matches")
    .select("id, match_number, opponent_name, status, overs_limit")
    .eq("share_slug", slug)
    .maybeSingle();

  if (!match) {
    return (
      <main className="p-6">
        <p className="font-medium">Match no longer available.</p>
        <p className="mt-2 text-sm text-[var(--rw-muted)]">
          This match may have been removed.
        </p>
      </main>
    );
  }

  const bootstrap = await loadScoringBootstrap(slug);

  return (
    <LiveScoreScreen
      slug={slug}
      matchId={match.id}
      matchNumber={match.match_number}
      opponentName={match.opponent_name}
      status={match.status}
      oversLabel={`${match.overs_limit} overs`}
      bootstrap={bootstrap}
    />
  );
}
