import Link from "next/link";
import { ScorecardBackgroundMusic } from "@/components/scorecard/scorecard-background-music";
import { FullMatchScorecard } from "@/components/scorecard/full-match-scorecard";
import { BackButton, PageBackAnchor } from "@/components/ui/back-button";
import { getServerSession } from "@/lib/auth/server-session";
import { loadFullMatchScorecardData } from "@/lib/data/match-scorecard";
import { canShowFullMatchScorecardPage } from "@/lib/scorecard/public-scorecard-access";
import { publicLivePath } from "@/lib/match/share-slug";
import { createClient } from "@/lib/supabase/server";

interface PageProps {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ from?: string }>;
}

export async function generateMetadata({ params }: PageProps) {
  const { slug } = await params;
  const data = await loadFullMatchScorecardData(slug);
  if (!data) {
    return { title: "Scorecard" };
  }
  return {
    title: `${data.document.matchNumber} · Scorecard`,
  };
}

function ScorecardUnavailable({
  title,
  description,
  action,
}: {
  title: string;
  description: string;
  action?: { href: string; label: string };
}) {
  return (
    <main className="rw-app-bg mx-auto max-w-lg p-6 text-[var(--rw-text)]">
      <PageBackAnchor className="mb-4">
        <BackButton href="/" ariaLabel="Back to home" />
      </PageBackAnchor>
      <h1 className="text-xl font-semibold">{title}</h1>
      <p className="mt-2 text-sm text-[var(--rw-muted)]">{description}</p>
      {action ? (
        <Link
          href={action.href}
          className="rw-focus-ring rw-btn-primary mt-6 inline-block text-center"
        >
          {action.label}
        </Link>
      ) : null}
    </main>
  );
}

export default async function PublicMatchScorecardPage({
  params,
  searchParams,
}: PageProps) {
  const { slug } = await params;
  const { from } = await searchParams;
  const fromScorecards = from === "scorecards";
  const backHref = fromScorecards ? "/scorecards" : publicLivePath(slug);
  const backLabel = fromScorecards ? "Scorecards" : "Match Centre";
  const backAria = fromScorecards
    ? "Back to scorecards"
    : "Back to match centre";
  const { admin } = await getServerSession();
  const supabase = await createClient();

  const { data: gate } = await supabase
    .from("matches")
    .select("status, is_public_scorecard, is_public_live, share_slug")
    .eq("share_slug", slug)
    .maybeSingle();

  if (!gate) {
    return (
      <ScorecardUnavailable
        title="Match no longer available"
        description="This scorecard may be private, not yet published, or the match was removed."
      />
    );
  }

  if (gate.status === "setup" || gate.status === "abandoned") {
    return (
      <ScorecardUnavailable
        title="Scorecard not ready"
        description="This match has not started scoring yet."
        action={{ href: publicLivePath(slug), label: "Match Centre" }}
      />
    );
  }

  if (!canShowFullMatchScorecardPage(gate, { isAdmin: admin })) {
    return (
      <ScorecardUnavailable
        title="Scorecard not available"
        description="This completed match scorecard is not published for public viewing."
      />
    );
  }

  const data = await loadFullMatchScorecardData(slug);
  if (!data) {
    return (
      <ScorecardUnavailable
        title="Could not load scorecard"
        description="Please try again later."
      />
    );
  }

  return (
    <main className="rw-app-bg min-h-full text-[var(--rw-text)]">
      <div className="mx-auto min-w-0 max-w-3xl px-4 py-6 pb-24 sm:px-6 sm:py-8 sm:pb-28">
        <PageBackAnchor className="mb-6">
          <BackButton href={backHref} label={backLabel} ariaLabel={backAria} />
        </PageBackAnchor>
        <FullMatchScorecard data={data} />
      </div>
      <ScorecardBackgroundMusic slug={slug} />
    </main>
  );
}
