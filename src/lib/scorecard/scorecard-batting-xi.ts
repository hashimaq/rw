import type { ScorecardSquadMember } from "@/lib/scorecard/build-scorecard";
import { formatDismissalLabel } from "@/lib/scorecard/format-dismissal";
import { battingOrder } from "@/lib/scorecard/innings-player-order";
import type { ScorecardInningsDocument } from "@/lib/scorecard/types";
import { buildInningsStateFromDeliveries } from "@/lib/scoring-engine";
import type { DeliveryInput, InningsScoreState } from "@/lib/scoring-engine/types";
import { participantKey, strikeRate } from "@/lib/scoring-engine/utils";
import type { BattingSide, InningsRow } from "@/lib/database/types";

export const SCORECARD_BATTING_XI_SIZE = 11;

type BattingFigure = ScorecardInningsDocument["battingFigures"][number];

export interface ScorecardXiMember {
  key: string;
  playerId: string | null;
  name: string;
  isGuest: boolean;
  isCaptain: boolean;
  isWicketkeeper: boolean;
}

function normalizeName(name: string): string {
  return name.replace(/\s*\(G\)\s*$/i, "").replace(/\s*\([^)]*\)\s*$/g, "").trim();
}

function memberKey(playerId: string | null, name: string): string {
  return participantKey(playerId, normalizeName(name));
}

function batterIdentityKey(
  playerId: string | null,
  name: string,
): string {
  if (playerId) return `id:${playerId}`;
  return participantKey(playerId, normalizeName(name));
}

function memberIdentityKey(m: ScorecardXiMember): string {
  return batterIdentityKey(m.playerId, m.name);
}

function squadXiMembers(squad: ScorecardSquadMember[]): ScorecardXiMember[] {
  const playing = squad.filter((m) => m.squadStatus === "playing_xi");
  const sorted = [...playing].sort((a, b) => {
    const pa = a.battingPosition ?? 999;
    const pb = b.battingPosition ?? 999;
    if (pa !== pb) return pa - pb;
    const oa = a.squadOrder ?? 9999;
    const ob = b.squadOrder ?? 9999;
    if (oa !== ob) return oa - ob;
    const ja = a.jerseyNumber ?? 9999;
    const jb = b.jerseyNumber ?? 9999;
    if (ja !== jb) return ja - jb;
    return a.fullName.localeCompare(b.fullName);
  });

  return sorted.slice(0, SCORECARD_BATTING_XI_SIZE).map((m) => ({
    key: m.playerId,
    playerId: m.playerId,
    name: m.fullName,
    isGuest: m.isGuest,
    isCaptain: m.isCaptain,
    isWicketkeeper: m.isWicketkeeper,
  }));
}

function opponentXiMembers(
  allInnings: InningsRow[],
  deliveriesByInningsId: Map<string, DeliveryInput[]>,
): ScorecardXiMember[] {
  const names: string[] = [];
  const push = (name: string) => {
    const n = normalizeName(name);
    if (n && !names.includes(n)) names.push(n);
  };

  for (const row of [...allInnings].sort(
    (a, b) => a.innings_number - b.innings_number,
  )) {
    if (row.batting_team !== "opponent") continue;
    const deliveries = deliveriesByInningsId.get(row.id) ?? [];
    const state = buildInningsStateFromDeliveries(
      deliveries,
      row.overs_limit ?? 20,
    );
    for (const b of battingOrder(state)) {
      push(b.name);
    }
  }

  return names.slice(0, SCORECARD_BATTING_XI_SIZE).map((name, index) => ({
    key: `opponent-xi:${index}:${normalizeName(name)}`,
    playerId: null,
    name,
    isGuest: false,
    isCaptain: false,
    isWicketkeeper: false,
  }));
}

function xiFromBattedOnly(state: InningsScoreState): ScorecardXiMember[] {
  return battingOrder(state)
    .slice(0, SCORECARD_BATTING_XI_SIZE)
    .map((b) => ({
      key: memberKey(b.playerId, b.name),
      playerId: b.playerId,
      name: b.name,
      isGuest: false,
      isCaptain: false,
      isWicketkeeper: false,
    }));
}

export function resolveScorecardXi(
  battingTeam: BattingSide,
  state: InningsScoreState,
  squad: ScorecardSquadMember[],
  allInnings: InningsRow[],
  deliveriesByInningsId: Map<string, DeliveryInput[]>,
): ScorecardXiMember[] {
  if (battingTeam === "red_wings") {
    const fromSquad = squadXiMembers(squad);
    if (fromSquad.length > 0) return fromSquad;
    return xiFromBattedOnly(state);
  }
  const fromOpponent = opponentXiMembers(allInnings, deliveriesByInningsId);
  if (fromOpponent.length > 0) return fromOpponent;
  return xiFromBattedOnly(state);
}

function displayName(m: ScorecardXiMember): string {
  const tags: string[] = [];
  if (m.isCaptain) tags.push("C");
  if (m.isWicketkeeper) tags.push("WK");
  if (tags.length > 0) return `${m.name} (${tags.join(" & ")})`;
  return m.isGuest ? `${m.name} (G)` : m.name;
}

function rowFromBatter(
  b: ReturnType<typeof battingOrder>[number],
  guestPlayerIds: ReadonlySet<string>,
): BattingFigure {
  return {
    name: b.name,
    playerId: b.playerId,
    runs: b.runs,
    balls: b.balls,
    fours: b.fours,
    sixes: b.sixes,
    strikeRate: strikeRate(b.runs, b.balls),
    dismissal: b.isOut ? formatDismissalLabel(b.dismissalLabel) : null,
    isNotOut: !b.isOut,
    isGuest: b.playerId != null && guestPlayerIds.has(b.playerId),
    didNotBat: false,
  };
}

function didNotBatRow(m: ScorecardXiMember): BattingFigure {
  return {
    name: displayName(m),
    playerId: m.playerId,
    runs: 0,
    balls: 0,
    fours: 0,
    sixes: 0,
    strikeRate: 0,
    dismissal: null,
    isNotOut: false,
    isGuest: m.isGuest,
    didNotBat: true,
  };
}

function rowIdentityFromBatter(b: {
  playerId: string | null;
  name: string;
}): string {
  return batterIdentityKey(b.playerId, b.name);
}

/** Exactly 11 rows: batted players (delivery order) then XI members who did not bat. */
export function buildScorecardBattingFigures(
  state: InningsScoreState,
  inningsRow: InningsRow,
  squad: ScorecardSquadMember[],
  guestPlayerIds: ReadonlySet<string>,
  allInnings: InningsRow[],
  deliveriesByInningsId: Map<string, DeliveryInput[]>,
): BattingFigure[] {
  const xi = resolveScorecardXi(
    inningsRow.batting_team,
    state,
    squad,
    allInnings,
    deliveriesByInningsId,
  );
  const batted = battingOrder(state);

  const rows: BattingFigure[] = [];
  const seen = new Set<string>();

  for (const b of batted) {
    if (rows.length >= SCORECARD_BATTING_XI_SIZE) break;
    const id = rowIdentityFromBatter(b);
    if (seen.has(id)) continue;
    seen.add(id);
    if (b.playerId) seen.add(batterIdentityKey(b.playerId, b.name));
    rows.push(rowFromBatter(b, guestPlayerIds));
  }

  for (const member of xi) {
    if (rows.length >= SCORECARD_BATTING_XI_SIZE) break;
    const id = memberIdentityKey(member);
    if (seen.has(id)) continue;
    seen.add(id);
    rows.push(didNotBatRow(member));
  }

  return rows.slice(0, SCORECARD_BATTING_XI_SIZE);
}
