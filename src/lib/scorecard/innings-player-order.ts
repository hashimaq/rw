import type { InningsScoreState } from "@/lib/scoring-engine/types";
import { participantKey } from "@/lib/scoring-engine/utils";

/** Batting table order: appearance in deliveries, then crease, then map keys. */
export function battingOrder(state: InningsScoreState) {
  const seen: string[] = [];
  const push = (key: string | null | undefined) => {
    if (!key || seen.includes(key) || !state.batters[key]) return;
    seen.push(key);
  };
  for (const d of state.deliveries) {
    push(participantKey(d.strikerPlayerId, d.strikerName));
    push(participantKey(d.nonStrikerPlayerId, d.nonStrikerName));
  }
  push(state.strikerKey);
  push(state.nonStrikerKey);
  for (const key of Object.keys(state.batters)) push(key);
  return seen.map((key) => state.batters[key]!);
}

/** Bowling table order: appearance in deliveries, then current bowler. */
export function bowlingOrder(state: InningsScoreState) {
  const seen: string[] = [];
  const push = (key: string | null | undefined) => {
    if (!key || seen.includes(key) || !state.bowlers[key]) return;
    seen.push(key);
  };
  for (const d of state.deliveries) {
    push(participantKey(d.bowlerPlayerId, d.bowlerName));
  }
  push(state.currentBowlerKey);
  for (const key of Object.keys(state.bowlers)) push(key);
  return seen.map((key) => state.bowlers[key]!);
}
