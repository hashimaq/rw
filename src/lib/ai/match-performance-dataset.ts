import type { ScorecardSquadMember } from "@/lib/scorecard/build-scorecard";
import type { FullMatchScorecardData } from "@/lib/scorecard/types";
import { resolvePlayerOfMatchTeam } from "@/lib/scorecard/player-of-match-display";
import { participantKey } from "@/lib/scoring-engine/utils";
import type {
  MatchPerformanceDataset,
  MatchPerformanceParticipant,
  ParticipationType,
} from "@/lib/ai/match-analysis-types";

function teamLabel(
  side: "red_wings" | "opponent",
  opponentName: string,
): string {
  return side === "red_wings" ? "Red Wings" : opponentName;
}

function mergeParticipation(
  prev: ParticipationType | undefined,
  next: ParticipationType,
): ParticipationType {
  if (!prev || prev === next) return next;
  return "batting_and_bowling";
}

function battingParticipated(b: {
  didNotBat?: boolean;
  balls: number;
  runs: number;
  isNotOut: boolean;
  dismissal: string | null;
}): boolean {
  if (b.didNotBat) return false;
  return b.balls > 0 || b.runs > 0 || Boolean(b.dismissal);
}

function bowlingParticipated(bw: {
  overs: string;
  runs: number;
  wickets: number;
}): boolean {
  if (bw.wickets > 0 || bw.runs > 0) return true;
  return bw.overs !== "0.0" && bw.overs !== "0" && bw.overs !== "";
}

function resolvePlayerId(
  name: string,
  squad: ScorecardSquadMember[],
): string | null {
  const norm = name.trim().toLowerCase();
  const hit = squad.find((m) => m.fullName.trim().toLowerCase() === norm);
  return hit?.playerId ?? null;
}

/** Authoritative participating players only — from rebuilt scorecard figures. */
export function buildMatchPerformanceDataset(
  data: FullMatchScorecardData,
  squad: ScorecardSquadMember[] = [],
): MatchPerformanceDataset {
  const map = new Map<string, MatchPerformanceParticipant>();

  for (const inn of data.innings) {
    const batTeam = teamLabel(inn.innings.battingTeam, data.document.opponent);
    const bowlTeam = teamLabel(inn.innings.bowlingTeam, data.document.opponent);

    for (const b of inn.innings.battingFigures) {
      if (!battingParticipated(b)) continue;
      const playerId = resolvePlayerId(b.name, squad);
      const key = participantKey(playerId, b.name);
      const existing = map.get(key);
      const entry: MatchPerformanceParticipant = existing ?? {
        participantKey: key,
        name: b.name,
        playerId,
        teamLabel: resolvePlayerOfMatchTeam(
          playerId,
          b.name,
          data.document.opponent,
          squad,
          data.innings,
        ),
        participation: "batting",
      };
      entry.participation = mergeParticipation(
        existing?.participation,
        "batting",
      );
      entry.teamLabel = batTeam;
      entry.batting = {
        runs: b.runs,
        balls: b.balls,
        fours: b.fours,
        sixes: b.sixes,
        strikeRate: b.strikeRate,
        isNotOut: b.isNotOut,
        dismissal: b.dismissal,
      };
      map.set(key, entry);
    }

    for (const bw of inn.innings.bowlingFigures) {
      if (!bowlingParticipated(bw)) continue;
      const playerId = resolvePlayerId(bw.name, squad);
      const key = participantKey(playerId, bw.name);
      const existing = map.get(key);
      const entry: MatchPerformanceParticipant = existing ?? {
        participantKey: key,
        name: bw.name,
        playerId,
        teamLabel: resolvePlayerOfMatchTeam(
          playerId,
          bw.name,
          data.document.opponent,
          squad,
          data.innings,
        ),
        participation: "bowling",
      };
      entry.participation = mergeParticipation(
        existing?.participation,
        "bowling",
      );
      if (!existing?.batting) entry.teamLabel = bowlTeam;
      entry.bowling = {
        overs: bw.overs,
        maidens: bw.maidens,
        runs: bw.runs,
        wickets: bw.wickets,
        wides: bw.wides,
        noBalls: bw.noBalls,
        economy: bw.economy,
      };
      map.set(key, entry);
    }
  }

  const participants = [...map.values()].sort((a, b) =>
    a.name.localeCompare(b.name),
  );

  return {
    matchId: data.matchId,
    opponentName: data.document.opponent,
    resultSummary: data.document.resultSummary,
    inningsSummaries: data.innings.map((inn) => ({
      inningsNumber: inn.inningsNumber,
      battingTeamLabel: teamLabel(inn.innings.battingTeam, data.document.opponent),
      totalRuns: inn.innings.totalRuns,
      wickets: inn.innings.wickets,
      overs: inn.innings.overs,
    })),
    participants,
  };
}
