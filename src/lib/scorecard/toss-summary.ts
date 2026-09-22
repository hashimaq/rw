import type { Match } from "@/lib/database/types";

export function formatMatchTossSummary(match: Pick<Match, "toss_winner" | "toss_decision">): string | null {
  if (!match.toss_winner || !match.toss_decision) return null;
  const winnerLabel =
    match.toss_winner === "red_wings" ? "Red Wings" : "Opponent";
  const decisionLabel = match.toss_decision === "bat" ? "bat" : "bowl";
  return `${winnerLabel} won the toss and chose to ${decisionLabel}`;
}
