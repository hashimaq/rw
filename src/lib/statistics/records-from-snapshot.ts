import type { Player } from "@/lib/database/types";
import type { CareerStatisticsSnapshot } from "@/lib/statistics/aggregate-career";
import type { PlayerCareerStats } from "@/lib/statistics/player-career";

export interface RecordHolderRow {
  id: string;
  label: string;
  playerId: string | null;
  playerName: string;
  value: string;
  context: string | null;
}

const MIN_BALLS_STRIKE_RATE = 20;
const MIN_OVERS_ECONOMY = 2;

function nameFor(players: Player[], playerId: string | null): string {
  if (!playerId) return "—";
  return players.find((p) => p.id === playerId)?.full_name ?? playerId;
}

function topCareer(
  players: Player[],
  statsByPlayerId: Record<string, PlayerCareerStats>,
  pick: (s: PlayerCareerStats) => number,
  format: (s: PlayerCareerStats) => string,
  label: string,
  id: string,
  minValue = 1,
): RecordHolderRow | null {
  let best: { playerId: string; stats: PlayerCareerStats; value: number } | null =
    null;
  for (const [playerId, stats] of Object.entries(statsByPlayerId)) {
    const v = pick(stats);
    if (v < minValue) continue;
    if (!best || v > best.value) {
      best = { playerId, stats, value: v };
    }
  }
  if (!best) return null;
  return {
    id,
    label,
    playerId: best.playerId,
    playerName: nameFor(players, best.playerId),
    value: format(best.stats),
    context: "Career · completed matches",
  };
}

function minEconomyCareer(
  players: Player[],
  statsByPlayerId: Record<string, PlayerCareerStats>,
): RecordHolderRow | null {
  let best: { playerId: string; stats: PlayerCareerStats; econ: number } | null =
    null;
  for (const [playerId, stats] of Object.entries(statsByPlayerId)) {
    if (stats.oversBowled < MIN_OVERS_ECONOMY || stats.economy == null) continue;
    if (!best || stats.economy < best.econ) {
      best = { playerId, stats, econ: stats.economy };
    }
  }
  if (!best) return null;
  return {
    id: "best-economy",
    label: "Best career economy",
    playerId: best.playerId,
    playerName: nameFor(players, best.playerId),
    value: best.stats.economy!.toFixed(2),
    context: `Min ${MIN_OVERS_ECONOMY} overs bowled`,
  };
}

function maxStrikeRateCareer(
  players: Player[],
  statsByPlayerId: Record<string, PlayerCareerStats>,
): RecordHolderRow | null {
  let best: { playerId: string; stats: PlayerCareerStats; sr: number } | null =
    null;
  for (const [playerId, stats] of Object.entries(statsByPlayerId)) {
    if (stats.ballsFaced < MIN_BALLS_STRIKE_RATE || stats.strikeRate == null) {
      continue;
    }
    if (!best || stats.strikeRate > best.sr) {
      best = { playerId, stats, sr: stats.strikeRate };
    }
  }
  if (!best) return null;
  return {
    id: "best-strike-rate",
    label: "Best career strike rate",
    playerId: best.playerId,
    playerName: nameFor(players, best.playerId),
    value: best.stats.strikeRate!.toFixed(1),
    context: `Min ${MIN_BALLS_STRIKE_RATE} balls faced`,
  };
}

function bestCareerBowlingFigures(
  players: Player[],
  statsByPlayerId: Record<string, PlayerCareerStats>,
): RecordHolderRow | null {
  const parse = (s: string) => {
    const [w, r] = s.split("/").map(Number);
    return { w: w ?? 0, r: r ?? 999 };
  };
  let best: { playerId: string; figures: string } | null = null;
  for (const [playerId, stats] of Object.entries(statsByPlayerId)) {
    if (!stats.bestBowling) continue;
    if (!best) {
      best = { playerId, figures: stats.bestBowling };
      continue;
    }
    const pa = parse(stats.bestBowling);
    const pb = parse(best.figures);
    if (pa.w > pb.w || (pa.w === pb.w && pa.r < pb.r)) {
      best = { playerId, figures: stats.bestBowling };
    }
  }
  if (!best) return null;
  return {
    id: "best-career-bowling",
    label: "Best career bowling (single innings)",
    playerId: best.playerId,
    playerName: nameFor(players, best.playerId),
    value: best.figures,
    context: "Career best figures",
  };
}

/** Records derived from the same cached career snapshot as Stats/Profiles. */
export function buildRecordsFromCareerSnapshot(
  snapshot: CareerStatisticsSnapshot,
  players: Player[],
): RecordHolderRow[] {
  const { statsByPlayerId, recentByPlayerId } = snapshot;
  const rows: RecordHolderRow[] = [];

  for (const row of [
    topCareer(
      players,
      statsByPlayerId,
      (s) => s.runs,
      (s) => String(s.runs),
      "Most career runs",
      "most-runs",
    ),
    topCareer(
      players,
      statsByPlayerId,
      (s) => s.wickets,
      (s) => String(s.wickets),
      "Most career wickets",
      "most-wickets",
    ),
    topCareer(
      players,
      statsByPlayerId,
      (s) => s.highestScore,
      (s) => String(s.highestScore),
      "Highest score (career best innings)",
      "highest-score",
    ),
    topCareer(
      players,
      statsByPlayerId,
      (s) => s.sixes,
      (s) => String(s.sixes),
      "Most career sixes",
      "most-sixes",
    ),
    topCareer(
      players,
      statsByPlayerId,
      (s) => s.fours,
      (s) => String(s.fours),
      "Most career fours",
      "most-fours",
    ),
    topCareer(
      players,
      statsByPlayerId,
      (s) => s.catches,
      (s) => String(s.catches),
      "Most catches",
      "most-catches",
    ),
    minEconomyCareer(players, statsByPlayerId),
    maxStrikeRateCareer(players, statsByPlayerId),
    bestCareerBowlingFigures(players, statsByPlayerId),
  ]) {
    if (row) rows.push(row);
  }

  let bestInningsScore: {
    playerId: string;
    runs: number;
    matchNumber: string;
    opponent: string;
  } | null = null;
  let bestInningsBowling: {
    playerId: string;
    wickets: number;
    runs: number;
    matchNumber: string;
  } | null = null;

  for (const [playerId, list] of Object.entries(recentByPlayerId)) {
    for (const perf of list) {
      if (perf.batting && perf.batting.runs > 0) {
        if (!bestInningsScore || perf.batting.runs > bestInningsScore.runs) {
          bestInningsScore = {
            playerId,
            runs: perf.batting.runs,
            matchNumber: perf.matchNumber,
            opponent: perf.opponentName,
          };
        }
      }
      if (perf.bowling && perf.bowling.wickets > 0) {
        const w = perf.bowling.wickets;
        const r = perf.bowling.runsConceded;
        if (
          !bestInningsBowling ||
          w > bestInningsBowling.wickets ||
          (w === bestInningsBowling.wickets && r < bestInningsBowling.runs)
        ) {
          bestInningsBowling = {
            playerId,
            wickets: w,
            runs: r,
            matchNumber: perf.matchNumber,
          };
        }
      }
    }
  }

  if (bestInningsScore) {
    rows.push({
      id: "best-innings-score",
      label: "Best innings (runs)",
      playerId: bestInningsScore.playerId,
      playerName: nameFor(players, bestInningsScore.playerId),
      value: String(bestInningsScore.runs),
      context: `${bestInningsScore.matchNumber} vs ${bestInningsScore.opponent}`,
    });
  }

  if (bestInningsBowling) {
    rows.push({
      id: "best-innings-bowling",
      label: "Best innings (bowling)",
      playerId: bestInningsBowling.playerId,
      playerName: nameFor(players, bestInningsBowling.playerId),
      value: `${bestInningsBowling.wickets}/${bestInningsBowling.runs}`,
      context: bestInningsBowling.matchNumber,
    });
  }

  return rows;
}
