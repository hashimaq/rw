import Link from "next/link";
import { redirect } from "next/navigation";
import { HomeHeroBranding } from "@/components/home/home-hero-branding";
import { StartScoringButton } from "@/components/match-setup/start-scoring-button";
import { DeleteMatchButton } from "@/components/admin/delete-match-button";
import { ScorerMatchDeleteSection } from "@/components/scoring/scorer-match-delete-section";
import { BackButton, PageBackAnchor } from "@/components/ui/back-button";
import { EmptyState } from "@/components/ui/empty-state";
import { getServerSession } from "@/lib/auth/server-session";
import { fetchMatchWithSquad } from "@/lib/data/match-detail";

export const metadata = { title: "Match Ready" };

interface PageProps {
  searchParams: Promise<{ matchId?: string }>;
}

export default async function MatchReadyPage({ searchParams }: PageProps) {
  const { admin } = await getServerSession();

  const { matchId } = await searchParams;
  if (!matchId) {
    redirect("/matches/setup");
  }

  let data: Awaited<ReturnType<typeof fetchMatchWithSquad>> = null;
  try {
    data = await fetchMatchWithSquad(matchId);
  } catch {
    data = null;
  }

  if (!data) {
    return (
      <EmptyState
        title="Match not found"
        description="This match may have been removed or you may not have access."
        actionLabel="New match setup"
        actionHref="/matches/setup"
      />
    );
  }

  const { match, squad } = data;
  const xi = squad.filter((m) => m.squad_status === "playing_xi");
  const bench = squad.filter((m) => m.squad_status === "bench");
  const captain = xi.find((m) => m.is_captain);
  const keeper = xi.find((m) => m.is_wicketkeeper);
  const shareSlug = match.share_slug;
  const readyLabel = match.status === "setup" ? "Ready to start" : match.status;

  return (
    <div className="mx-auto max-w-2xl space-y-8 rw-animate-in">
      <PageBackAnchor>
        <BackButton href="/matches/setup" ariaLabel="Go back to match setup" />
      </PageBackAnchor>
      <header className="flex flex-col items-center text-center">
        <HomeHeroBranding logoSize={104} />
        <p className="mt-4 text-xs font-bold uppercase tracking-[0.2em] text-[var(--rw-muted)]">
          Match ready
        </p>
        <h1 className="rw-home-wordmark mt-2 text-3xl">RED WINGS</h1>
        <p className="mt-3 text-2xl font-bold tabular-nums">{match.match_number}</p>
        <p className="mt-2 text-lg">
          <span className="text-[var(--rw-muted)]">vs</span> {match.opponent_name}
        </p>
        <p className="mt-1 text-sm font-semibold uppercase tracking-wide text-[var(--rw-primary)]">
          {readyLabel}
        </p>
        <p className="mt-1 text-sm text-[var(--rw-muted)]">
          {match.overs_limit} overs
        </p>
      </header>

      <section className="rw-card space-y-3 p-5 text-sm">
        <h2 className="font-semibold">Toss</h2>
        <p className="text-[var(--rw-muted)]">
          Winner: {match.toss_winner?.replaceAll("_", " ") ?? "—"} · Decision:{" "}
          {match.toss_decision ?? "—"}
        </p>
        <p>
          Red Wings{" "}
          {match.red_wings_batting_first ? "bat first" : "bowl first"}
        </p>
      </section>

      <section className="rw-card p-5 text-sm">
        <h2 className="font-semibold">Match squad</h2>
        <ul className="mt-3 space-y-2">
          {xi.map((m) => (
            <li key={m.player_id} className="flex items-center justify-between gap-2">
              <span>
                {!m.player.is_official_squad ? (
                  <span className="mr-2 rounded bg-amber-500/15 px-1.5 py-0.5 text-[10px] font-bold uppercase text-amber-700 dark:text-amber-400">
                    Guest
                  </span>
                ) : null}
                {m.player.full_name}
              </span>
              {m.player.jersey_number != null ? (
                <span className="text-[var(--rw-muted)]">#{m.player.jersey_number}</span>
              ) : null}
            </li>
          ))}
        </ul>
        {bench.length > 0 ? (
          <p className="mt-4 text-xs text-[var(--rw-muted)]">
            Bench: {bench.map((b) => b.player.full_name).join(", ")}
          </p>
        ) : null}
        <p className="mt-3 text-[var(--rw-muted)]">
          Captain: {captain?.player.full_name ?? "—"} · WK:{" "}
          {keeper?.player.full_name ?? "—"}
        </p>
      </section>

      <div className="flex flex-col gap-3 sm:flex-row">
        {shareSlug ? (
          <StartScoringButton
            matchId={match.id}
            shareSlug={shareSlug}
            matchStatus={match.status}
            allowAdminBootstrap={admin}
            className="flex-1"
          />
        ) : (
          <p className="text-sm text-[var(--rw-muted)]">
            Missing share link — contact an admin.
          </p>
        )}
        <Link href="/matches" className="rw-focus-ring rw-btn-secondary flex-1 text-center">
          View matches
        </Link>
      </div>

      {admin ? (
        <div className="flex justify-center border-t border-[var(--rw-border)] pt-6">
          <DeleteMatchButton
            matchId={match.id}
            matchNumber={match.match_number}
            opponentName={match.opponent_name}
            status={match.status}
          />
        </div>
      ) : null}

      {shareSlug ? (
        <ScorerMatchDeleteSection
          slug={shareSlug}
          matchId={match.id}
          matchNumber={match.match_number}
          opponentName={match.opponent_name}
          status={match.status}
        />
      ) : null}
    </div>
  );
}
