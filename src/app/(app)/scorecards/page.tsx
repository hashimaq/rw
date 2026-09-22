import { CompletedScorecardListItem } from "@/components/scorecards/completed-scorecard-list-item";
import { EmptyState } from "@/components/ui/empty-state";
import { fetchCompletedScorecardSummaries } from "@/lib/data/completed-scorecard-list";

export const metadata = {
  title: "Scorecards",
  description: "Completed match scorecards — Red Wings Cricket",
};

export default async function ScorecardsPage() {
  let summaries: Awaited<ReturnType<typeof fetchCompletedScorecardSummaries>> =
    [];
  let failed = false;

  try {
    summaries = await fetchCompletedScorecardSummaries();
  } catch {
    failed = true;
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6 rw-animate-in">
      <header className="space-y-1">
        <h1 className="text-2xl font-bold tracking-tight">Scorecards</h1>
        <p className="text-sm text-[var(--rw-muted)]">
          Completed Match Scorecards
        </p>
      </header>

      {failed ? (
        <EmptyState
          title="Could not load scorecards"
          description="Please try again in a moment."
        />
      ) : summaries.length === 0 ? (
        <EmptyState
          title="No completed matches yet"
          description="Completed match scorecards will appear here once matches are finished."
        />
      ) : (
        <ul className="grid min-w-0 gap-3 sm:gap-4">
          {summaries.map((summary) => (
            <CompletedScorecardListItem key={summary.id} summary={summary} />
          ))}
        </ul>
      )}
    </div>
  );
}
