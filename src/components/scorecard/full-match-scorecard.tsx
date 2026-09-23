import { MatchScorecardTabs } from "@/components/scorecard/match-scorecard-tabs";
import type { FullMatchScorecardData } from "@/lib/scorecard/types";

export function FullMatchScorecard({ data }: { data: FullMatchScorecardData }) {
  return <MatchScorecardTabs data={data} />;
}
