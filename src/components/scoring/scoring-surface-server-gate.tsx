import { ScoringInstallRequired } from "@/components/scoring/scoring-install-required";
import { LiveScoreScreen } from "@/components/live/live-score-screen";
import { isScoringSurfaceAllowedOnServer } from "@/lib/auth/scoring-installed-surface";
import { loadScoringBootstrap } from "@/lib/data/scoring-bootstrap";

export async function ScoringSurfaceServerGate({ slug }: { slug: string }) {
  const surfaceAllowed = await isScoringSurfaceAllowedOnServer();

  if (!surfaceAllowed) {
    return <ScoringInstallRequired slug={slug} />;
  }

  const bootstrap = await loadScoringBootstrap(slug);

  if (!bootstrap) {
    return (
      <main className="p-6">
        <p className="font-medium">Match no longer available.</p>
        <p className="mt-2 text-sm text-[var(--rw-muted)]">
          This match may have been removed.
        </p>
      </main>
    );
  }

  return (
    <LiveScoreScreen
      slug={slug}
      matchId={bootstrap.matchId}
      matchNumber={bootstrap.matchNumber}
      opponentName={bootstrap.opponentName}
      status={bootstrap.status}
      oversLabel={`${bootstrap.oversLimit} overs`}
      bootstrap={bootstrap}
    />
  );
}
