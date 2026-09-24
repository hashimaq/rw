import type { InningsScoreState } from "@/lib/scoring-engine/types";
import type { CreaseDisplayBatter } from "@/lib/scoring/crease-sync";

/** Live scoring row: authoritative crease display first, then active engine keys. */
export function liveCreaseBatterForEnd(
  state: InningsScoreState,
  end: "striker" | "non_striker",
  crease: {
    striker: CreaseDisplayBatter | null;
    nonStriker: CreaseDisplayBatter | null;
  },
  pendingName: string | null,
  toRow: (state: InningsScoreState, key: string, onStrike: boolean) => CreaseDisplayBatter,
  pendingRow: (name: string) => CreaseDisplayBatter,
): CreaseDisplayBatter | null {
  const creaseEnd = end === "striker" ? crease.striker : crease.nonStriker;
  if (creaseEnd) return creaseEnd;

  const endKey = end === "striker" ? state.strikerKey : state.nonStrikerKey;
  if (endKey && state.batters[endKey] && !state.batters[endKey].isOut) {
    return toRow(state, endKey, end === "striker");
  }
  if (pendingName) return pendingRow(pendingName);
  return null;
}
