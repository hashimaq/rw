import { ManOfTheMatchSection } from "@/components/scorecard/man-of-the-match-section";
import { MatchScorecardHeader } from "@/components/scorecard/match-scorecard-header";
import { ScorecardInningsSelector } from "@/components/scorecard/scorecard-innings-selector";
import type { FullMatchScorecardData } from "@/lib/scorecard/types";

export function FullMatchScorecard({ data }: { data: FullMatchScorecardData }) {
  return (
    <article className="mx-auto min-w-0 w-full max-w-3xl space-y-6">
      <MatchScorecardHeader data={data} />
      <ScorecardInningsSelector data={data} />
      {data.status === "completed" ? (
        <ManOfTheMatchSection display={data.playerOfTheMatch} />
      ) : null}
    </article>
  );
}
