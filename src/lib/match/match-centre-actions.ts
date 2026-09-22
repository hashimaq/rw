import { publicLivePath, publicScorecardPath } from "@/lib/match/share-slug";
import type { MatchStatus } from "@/lib/database/types";

export interface MatchCentreAction {
  label: string;
  href: string;
  variant: "primary" | "secondary";
}

/** Hub actions for `/live/[slug]` — distinct live, scorecard, and scorer paths. */
export function getMatchCentreHubActions(
  status: MatchStatus,
  slug: string,
): MatchCentreAction[] {
  const liveScore = `${publicLivePath(slug)}/score`;
  const scorecard = publicScorecardPath(slug);
  const enterPin = `${publicLivePath(slug)}/enter-pin`;

  if (status === "completed") {
    return [
      { label: "View Scorecard", href: scorecard, variant: "primary" },
      { label: "Match Centre", href: liveScore, variant: "secondary" },
    ];
  }

  return [
    { label: "View Live", href: liveScore, variant: "primary" },
    { label: "Scorecard", href: scorecard, variant: "secondary" },
    { label: "Enter as Scorer", href: enterPin, variant: "secondary" },
  ];
}
