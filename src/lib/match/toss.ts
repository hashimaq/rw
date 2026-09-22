import type { BattingSide, TossDecision } from "@/lib/database/types";

export function deriveRedWingsBattingFirst(
  tossWinner: BattingSide,
  tossDecision: TossDecision,
): boolean {
  if (tossWinner === "red_wings") {
    return tossDecision === "bat";
  }
  return tossDecision === "bowl";
}

export function firstInningsTeams(redWingsBatFirst: boolean): {
  batting: BattingSide;
  bowling: BattingSide;
} {
  return redWingsBatFirst
    ? { batting: "red_wings", bowling: "opponent" }
    : { batting: "opponent", bowling: "red_wings" };
}
