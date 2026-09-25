import type {
  BattingSide,
  InningsRow,
  MatchResult,
  SquadStatus,
} from "@/lib/database/types";
import { buildInningsStateFromDeliveries } from "@/lib/scoring-engine";
import {
  economy,
  oversDecimalFromLegalBalls,
  strikeRate,
} from "@/lib/scoring-engine/utils";
import type { DeliveryInput } from "@/lib/scoring-engine/types";
import { dedupeDeliveriesForStatistics } from "@/lib/statistics/dedupe-deliveries";
import {
  emptyPlayerCareerStats,
  type PlayerCareerStats,
} from "@/lib/statistics/player-career";

export interface CompletedMatchForStats {
  matchId: string;
  shareSlug: string | null;
  matchNumber: string;
  opponentName: string;
  matchDate: string | null;
  completedAt: string | null;
  oversLimit: number;
  winner: BattingSide | null;
  result: MatchResult;
  innings: InningsRow[];
  /** Deliveries grouped by innings id (deduped per innings during aggregation). */
  deliveriesByInningsId: Map<string, DeliveryInput[]>;
  squad: Array<{
    playerId: string;
    squadStatus: SquadStatus;
    isCaptain: boolean;
  }>;
}

export interface PlayerRecentInningsPerformance {
  matchId: string;
  shareSlug: string | null;
  matchNumber: string;
  opponentName: string;
  matchDate: string | null;
  completedAt: string | null;
  inningsNumber: number;
  battingTeam: BattingSide;
  batting: {
    runs: number;
    balls: number;
    fours: number;
    sixes: number;
    notOut: boolean;
  } | null;
  bowling: {
    wickets: number;
    runsConceded: number;
    legalBalls: number;
    maidens: number;
  } | null;
  catches: number;
}

export interface CareerStatisticsSnapshot {
  statsByPlayerId: Record<string, PlayerCareerStats>;
  recentByPlayerId: Record<string, PlayerRecentInningsPerformance[]>;
}

type MutableCareer = PlayerCareerStats & {
  dismissalsForAverage: number;
  bowlingLegalBalls: number;
  bestBowlingWickets: number;
  bestBowlingRuns: number;
};

function createMutable(playerId: string): MutableCareer {
  return {
    ...emptyPlayerCareerStats(playerId),
    dismissalsForAverage: 0,
    bowlingLegalBalls: 0,
    bestBowlingWickets: -1,
    bestBowlingRuns: 0,
  };
}

function battingAverage(runs: number, dismissals: number): number | null {
  if (dismissals === 0) return null;
  return Math.round((runs / dismissals) * 100) / 100;
}

function formatBestBowling(wickets: number, runs: number): string {
  return `${wickets}/${runs}`;
}

function isBetterBowling(aW: number, aR: number, bW: number, bR: number): boolean {
  if (aW !== bW) return aW > bW;
  return aR < bR;
}

function finalizeCareer(m: MutableCareer): PlayerCareerStats {
  const strike =
    m.ballsFaced > 0
      ? Math.round(strikeRate(m.runs, m.ballsFaced) * 100) / 100
      : null;
  const econ =
    m.bowlingLegalBalls > 0
      ? Math.round(economy(m.runsConceded, m.bowlingLegalBalls) * 100) / 100
      : null;
  const avg = battingAverage(m.runs, m.dismissalsForAverage);
  const bestBowling =
    m.bestBowlingWickets >= 0
      ? formatBestBowling(m.bestBowlingWickets, m.bestBowlingRuns)
      : null;

  return {
    playerId: m.playerId,
    matches: m.matches,
    innings: m.innings,
    runs: m.runs,
    highestScore: m.highestScore,
    average: avg,
    strikeRate: strike,
    ballsFaced: m.ballsFaced,
    fours: m.fours,
    sixes: m.sixes,
    ducks: m.ducks,
    oversBowled:
      m.bowlingLegalBalls > 0
        ? Math.round(oversDecimalFromLegalBalls(m.bowlingLegalBalls) * 10) / 10
        : 0,
    maidens: m.maidens,
    runsConceded: m.runsConceded,
    wickets: m.wickets,
    economy: econ,
    bestBowling,
    catches: m.catches,
    wins: m.wins,
    losses: m.losses,
    captaincyMatches: m.captaincyMatches,
    captaincyWins: m.captaincyWins,
    captaincyLosses: m.captaincyLosses,
  };
}

function applyWinLoss(
  m: MutableCareer,
  match: CompletedMatchForStats,
  playedXi: boolean,
  isCaptain: boolean,
) {
  if (!playedXi) return;
  if (
    match.result === "tie" ||
    match.result === "no_result" ||
    match.result === "abandoned"
  ) {
    return;
  }
  if (!match.winner) return;

  const rwWin = match.winner === "red_wings";
  if (rwWin) m.wins += 1;
  else m.losses += 1;

  if (isCaptain) {
    m.captaincyMatches += 1;
    if (rwWin) m.captaincyWins += 1;
    else m.captaincyLosses += 1;
  }
}

function recentSortKey(p: PlayerRecentInningsPerformance): string {
  return p.completedAt ?? p.matchDate ?? p.matchNumber;
}

/** Single authoritative career aggregation from completed match bundles. */
export function aggregateCareerStatistics(
  matches: CompletedMatchForStats[],
): CareerStatisticsSnapshot {
  const mutables = new Map<string, MutableCareer>();
  const recent = new Map<string, PlayerRecentInningsPerformance[]>();
  const matchPlayed = new Map<string, Set<string>>();

  const ensure = (playerId: string) => {
    let row = mutables.get(playerId);
    if (!row) {
      row = createMutable(playerId);
      mutables.set(playerId, row);
    }
    return row;
  };

  const markMatchPlayed = (playerId: string, matchId: string) => {
    let set = matchPlayed.get(playerId);
    if (!set) {
      set = new Set();
      matchPlayed.set(playerId, set);
    }
    if (!set.has(matchId)) {
      set.add(matchId);
      ensure(playerId).matches += 1;
    }
  };

  for (const match of matches) {
    const playingXi = new Set(
      match.squad
        .filter((s) => s.squadStatus === "playing_xi")
        .map((s) => s.playerId),
    );
    const captainId =
      match.squad.find((s) => s.isCaptain && s.squadStatus === "playing_xi")
        ?.playerId ?? null;

    const contributedThisMatch = new Set<string>();

    for (const inn of match.innings) {
      if (inn.innings_status !== "completed") continue;

      const list = dedupeDeliveriesForStatistics(
        match.deliveriesByInningsId.get(inn.id) ?? [],
      );
      const state = buildInningsStateFromDeliveries(
        list,
        inn.overs_limit,
        inn.target,
      );

      for (const batter of Object.values(state.batters)) {
        if (!batter.playerId) continue;
        if (batter.balls === 0 && !batter.isOut) continue;

        const pid = batter.playerId;
        contributedThisMatch.add(pid);
        const m = ensure(pid);

        m.innings += 1;
        m.runs += batter.runs;
        m.ballsFaced += batter.balls;
        m.fours += batter.fours;
        m.sixes += batter.sixes;
        if (batter.runs > m.highestScore) m.highestScore = batter.runs;
        if (batter.isOut) {
          m.dismissalsForAverage += 1;
          if (batter.runs === 0 && batter.balls > 0) m.ducks += 1;
        }

        const perf: PlayerRecentInningsPerformance = {
          matchId: match.matchId,
          shareSlug: match.shareSlug,
          matchNumber: match.matchNumber,
          opponentName: match.opponentName,
          matchDate: match.matchDate,
          completedAt: match.completedAt,
          inningsNumber: inn.innings_number,
          battingTeam: inn.batting_team,
          batting: {
            runs: batter.runs,
            balls: batter.balls,
            fours: batter.fours,
            sixes: batter.sixes,
            notOut: !batter.isOut,
          },
          bowling: null,
          catches: 0,
        };

        const bowl = Object.values(state.bowlers).find(
          (b) => b.playerId === pid,
        );
        if (bowl && bowl.legalBalls > 0) {
          perf.bowling = {
            wickets: bowl.wickets,
            runsConceded: bowl.runsConceded,
            legalBalls: bowl.legalBalls,
            maidens: bowl.maidens,
          };
        }

        const catches = list.filter(
          (d) =>
            d.isWicket &&
            d.wicketType === "caught" &&
            d.fielderPlayerId === pid,
        ).length;
        if (catches > 0) {
          m.catches += catches;
          perf.catches = catches;
        }

        const rec = recent.get(pid) ?? [];
        rec.push(perf);
        recent.set(pid, rec);
      }

      for (const bowler of Object.values(state.bowlers)) {
        if (!bowler.playerId || bowler.legalBalls === 0) continue;
        const pid = bowler.playerId;
        contributedThisMatch.add(pid);
        const m = ensure(pid);

        m.bowlingLegalBalls += bowler.legalBalls;
        m.runsConceded += bowler.runsConceded;
        m.wickets += bowler.wickets;
        m.maidens += bowler.maidens;

        if (
          isBetterBowling(
            bowler.wickets,
            bowler.runsConceded,
            m.bestBowlingWickets,
            m.bestBowlingRuns,
          )
        ) {
          m.bestBowlingWickets = bowler.wickets;
          m.bestBowlingRuns = bowler.runsConceded;
        }

        if (
          !Object.values(state.batters).some((b) => b.playerId === pid && b.balls > 0)
        ) {
          const rec = recent.get(pid) ?? [];
          rec.push({
            matchId: match.matchId,
            shareSlug: match.shareSlug,
            matchNumber: match.matchNumber,
            opponentName: match.opponentName,
            matchDate: match.matchDate,
            completedAt: match.completedAt,
            inningsNumber: inn.innings_number,
            battingTeam: inn.batting_team,
            batting: null,
            bowling: {
              wickets: bowler.wickets,
              runsConceded: bowler.runsConceded,
              legalBalls: bowler.legalBalls,
              maidens: bowler.maidens,
            },
            catches: 0,
          });
          recent.set(pid, rec);
        }
      }

      for (const d of list) {
        if (
          d.isWicket &&
          d.wicketType === "caught" &&
          d.fielderPlayerId &&
          !Object.values(state.batters).some(
            (b) => b.playerId === d.fielderPlayerId,
          )
        ) {
          contributedThisMatch.add(d.fielderPlayerId);
          ensure(d.fielderPlayerId).catches += 1;
        }
      }
    }

    for (const pid of contributedThisMatch) {
      if (playingXi.has(pid) || contributedThisMatch.has(pid)) {
        markMatchPlayed(pid, match.matchId);
      }
    }
    for (const pid of playingXi) {
      applyWinLoss(ensure(pid), match, true, captainId === pid);
    }
  }

  const statsByPlayerId: Record<string, PlayerCareerStats> = {};
  for (const [id, m] of mutables) {
    statsByPlayerId[id] = finalizeCareer(m);
  }

  const recentByPlayerId: Record<string, PlayerRecentInningsPerformance[]> =
    {};
  for (const [id, list] of recent) {
    recentByPlayerId[id] = [...list].sort((a, b) =>
      recentSortKey(b).localeCompare(recentSortKey(a)),
    );
  }

  return { statsByPlayerId, recentByPlayerId };
}

export function bowlingAverageFromCareer(
  stats: PlayerCareerStats,
): number | null {
  if (stats.wickets === 0) return null;
  return Math.round((stats.runsConceded / stats.wickets) * 100) / 100;
}
