import { createClient } from "@/lib/supabase/server";
import { MatchCentreHubActions } from "@/components/match/match-centre-hub-actions";
import { RedWingsIdentityBlock } from "@/components/branding/red-wings-logo";
import { BackButton, PageBackAnchor } from "@/components/ui/back-button";
import { LiveBadge } from "@/components/ui/live-badge";

interface PageProps {
  params: Promise<{ slug: string }>;
}

/** Public match entry — Watch Live (no PIN) or Enter as Scorer (PIN). */
export default async function PublicLivePage({ params }: PageProps) {
  const { slug } = await params;
  const supabase = await createClient();

  const { data: match } = await supabase
    .from("matches")
    .select("id, match_number, opponent_name, status, venue, share_slug, overs_limit")
    .eq("share_slug", slug)
    .maybeSingle();

  if (!match) {
    return (
      <main className="rw-app-bg mx-auto max-w-lg p-6 text-[var(--rw-text)]">
        <PageBackAnchor className="mb-4">
          <BackButton href="/" ariaLabel="Back to home" />
        </PageBackAnchor>
        <h1 className="text-xl font-semibold">Match no longer available</h1>
        <p className="mt-2 text-sm text-[var(--rw-muted)]">
          This link may be outdated or the match was removed.
        </p>
      </main>
    );
  }

  const isLive = match.status === "live";
  const isCompleted = match.status === "completed";

  return (
    <main className="rw-app-bg mx-auto flex min-h-full max-w-lg flex-col gap-8 px-6 py-10 text-[var(--rw-text)]">
      <PageBackAnchor>
        <BackButton href="/" ariaLabel="Back to home" />
      </PageBackAnchor>
      <header className="flex flex-col items-center text-center">
        <RedWingsIdentityBlock logoSize={112} priority panel />
        {isLive ? (
          <div className="mt-5">
            <LiveBadge />
          </div>
        ) : match.status === "setup" ? (
          <p className="mt-5 text-xs font-bold uppercase tracking-[0.2em] text-[var(--rw-primary)]">
            Ready to start
          </p>
        ) : isCompleted ? (
          <p className="mt-5 text-xs font-bold uppercase tracking-[0.2em] text-[var(--rw-muted)]">
            Match complete
          </p>
        ) : null}
        <h1 className="mt-4 text-2xl font-bold">
          Red Wings <span className="text-[var(--rw-muted)]">vs</span>{" "}
          {match.opponent_name}
        </h1>
        <p className="mt-1 text-sm text-[var(--rw-muted)]">
          {match.overs_limit} overs
          {match.match_number ? ` · ${match.match_number}` : ""}
        </p>
      </header>

      <MatchCentreHubActions slug={slug} status={match.status} />
      <p className="text-center text-xs text-[var(--rw-muted)]">
        {isCompleted
          ? "View the full professional scorecard or return to Match Centre."
          : "View Live and Scorecard are read-only. Enter as Scorer requires the match PIN."}
      </p>
    </main>
  );
}
