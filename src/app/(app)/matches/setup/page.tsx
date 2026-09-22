import { MatchSetupWizard } from "@/components/match-setup/match-setup-wizard";
import { BackButton, PageBackAnchor } from "@/components/ui/back-button";
import { EmptyState } from "@/components/ui/empty-state";
import { fetchMatchSetupOptions } from "@/lib/data/match-setup-options";

export const metadata = { title: "Match Setup" };

export default async function MatchSetupPage() {
  let options: Awaited<ReturnType<typeof fetchMatchSetupOptions>> | null = null;
  let loadError: string | null = null;
  try {
    options = await fetchMatchSetupOptions();
  } catch (err) {
    loadError = err instanceof Error ? err.message : "Unknown error";
    options = null;
  }

  return (
    <div className="mx-auto w-full max-w-2xl space-y-6 rw-animate-in">
      <header>
        <PageBackAnchor className="mb-3">
          <BackButton href="/start-scoring" ariaLabel="Go back to start scoring" />
        </PageBackAnchor>
        <h1 className="text-2xl font-bold tracking-tight">Match Setup</h1>
        <p className="mt-1 text-sm text-[var(--rw-muted)]">
          Match → Innings → Players → Review
        </p>
      </header>

      {!options ? (
        <EmptyState
          title="Could not load setup data"
          description={
            loadError
              ? "Check your connection and try again."
              : "Check Supabase connection and migrations, then try again."
          }
          actionLabel="Retry"
          actionHref="/matches/setup"
        />
      ) : (
        <MatchSetupWizard options={options} />
      )}
    </div>
  );
}
