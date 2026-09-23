import Link from "next/link";
import { MatchAiAdminPanel } from "@/components/scorecard/match-ai-admin-panel";
import { ScorecardBackgroundMusic } from "@/components/scorecard/scorecard-background-music";
import { FullMatchScorecard } from "@/components/scorecard/full-match-scorecard";
import { BackButton, PageBackAnchor } from "@/components/ui/back-button";
import { getServerSession } from "@/lib/auth/server-session";
import type { MatchAiAnalysisView } from "@/lib/ai/match-analysis-types";
import { loadMatchScorecardPage } from "@/lib/data/match-scorecard";
import { publicLivePath } from "@/lib/match/share-slug";

function aiAdminPanelStatus(
  view: MatchAiAnalysisView | undefined,
): string | null {
  if (!view) return null;
  switch (view.state) {
    case "ready":
      return "completed";
    case "pending":
    case "processing":
      return view.state;
    case "failed":
    case "unavailable":
    case "unavailable_incomplete":
      return "failed";
    default:
      return null;
  }
}

interface PageProps {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ from?: string }>;
}

export async function generateMetadata({ params }: PageProps) {
  const { slug } = await params;
  const result = await loadMatchScorecardPage(slug, false);
  if (result.status !== "ok") {
    return { title: "Scorecard" };
  }
  return {
    title: `${result.data.document.matchNumber} · Scorecard`,
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
  const result = await loadMatchScorecardPage(slug, admin);

  if (result.status === "not_found") {
    return (
      <ScorecardUnavailable
        title="Match no longer available"
        description="This scorecard may be private, not yet published, or the match was removed."
      />
    );
  }

  if (result.status === "not_ready") {
    return (
      <ScorecardUnavailable
        title="Scorecard not ready"
        description="This match has not started scoring yet."
        action={{ href: publicLivePath(slug), label: "Match Centre" }}
      />
    );
  }

  if (result.status === "forbidden") {
    return (
      <ScorecardUnavailable
        title="Scorecard not available"
        description="This completed match scorecard is not published for public viewing."
      />
    );
  }

  if (result.status === "incomplete_persisted_data") {
    const lines = result.inningsTotals.map((inn) => {
      const team =
        inn.battingTeam === "red_wings" ? "Red Wings" : "Opponent";
      return `${team}: ${inn.totalRuns}/${inn.wickets}`;
    });
    return (
      <ScorecardUnavailable
        title="Ball-by-ball scorecard unavailable"
        description={`Innings totals were saved (${lines.join(" · ")}${result.resultSummary ? ` · ${result.resultSummary}` : ""}), but delivery history was not synced to the server. Open the scorer on the device that recorded the match, stay online as the active scorer, and wait for sync to finish—or contact an admin.`}
        action={{ href: publicLivePath(slug), label: "Match Centre" }}
      />
    );
  }

  if (result.status === "error") {
    return (
      <ScorecardUnavailable
        title="Could not load scorecard"
        description="Please try again later."
      />
    );
  }

  const data = result.data;

  return (
    <main className="rw-app-bg min-h-full text-[var(--rw-text)]">
      <div className="mx-auto min-w-0 max-w-3xl px-4 py-6 sm:px-6 sm:py-8">
        <PageBackAnchor className="mb-6">
          <BackButton href={backHref} label={backLabel} ariaLabel={backAria} />
        </PageBackAnchor>
        <FullMatchScorecard data={data} />
        {admin && data.status === "completed" ? (
          <div className="mt-6">
            <MatchAiAdminPanel
              matchId={data.matchId}
              initialStatus={aiAdminPanelStatus(data.aiAnalysis)}
            />
          </div>
        ) : null}
      </div>
      <ScorecardBackgroundMusic slug={slug} />
    </main>
  );
}
