import type { ScorecardDocumentData, ScorecardInningsDocument } from "@/lib/scorecard/types";
import type { BattingSide } from "@/lib/database/types";

function xiLabel(p: {
  name: string;
  isCaptain: boolean;
  isWicketkeeper: boolean;
}): string {
  const tags: string[] = [];
  if (p.isCaptain) tags.push("C");
  if (p.isWicketkeeper) tags.push("WK");
  if (tags.length === 0) return p.name;
  return `${p.name} (${tags.join(" & ")})`;
}

/** Playing XI members who did not appear in batting figures (Red Wings innings only). */
export function yetToBatForInnings(
  doc: ScorecardInningsDocument,
  redWingsPlayingXi: ScorecardDocumentData["redWingsPlayingXi"],
): string[] {
  if (doc.battingTeam !== "red_wings") {
    return [];
  }

  const batted = new Set(
    doc.battingFigures.map((b) => b.name.replace(/\s*\(G\)\s*$/, "").trim()),
  );

  return redWingsPlayingXi
    .filter((p) => !batted.has(p.name))
    .map((p) => xiLabel(p));
}
