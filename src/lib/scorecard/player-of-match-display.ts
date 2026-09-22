import type { ScorecardSquadMember } from "@/lib/scorecard/build-scorecard";
import type { ScorecardInningsBuilt } from "@/lib/scorecard/types";
import type { BattingSide } from "@/lib/database/types";

export interface PlayerOfMatchDisplay {
  assigned: boolean;
  playerId: string | null;
  name: string | null;
  teamLabel: string | null;
  performanceSummary: string | null;
}

function normalizeName(name: string): string {
  return name.trim().toLowerCase();
}

function teamLabelForSide(
  side: BattingSide,
  opponentName: string,
): string {
  return side === "red_wings" ? "Red Wings" : opponentName;
}

export function resolvePlayerOfMatchTeam(
  playerId: string | null,
  playerName: string,
  opponentName: string,
  squad: ScorecardSquadMember[],
  inningsBuilt: ScorecardInningsBuilt[],
): string {
  if (playerId && squad.some((m) => m.playerId === playerId)) {
    return "Red Wings";
  }
  const norm = normalizeName(playerName);
  if (squad.some((m) => normalizeName(m.fullName) === norm)) {
    return "Red Wings";
  }

  for (const inn of inningsBuilt) {
    for (const b of inn.innings.battingFigures) {
      if (normalizeName(b.name) === norm) {
        return teamLabelForSide(inn.innings.battingTeam, opponentName);
      }
    }
    for (const bw of inn.innings.bowlingFigures) {
      if (normalizeName(bw.name) === norm) {
        return teamLabelForSide(inn.innings.bowlingTeam, opponentName);
      }
    }
  }

  return opponentName;
}

export function summarizePlayerMatchPerformance(
  playerName: string,
  inningsBuilt: ScorecardInningsBuilt[],
): string | null {
  const norm = normalizeName(playerName);
  let bat: {
    runs: number;
    balls: number;
    fours: number;
    sixes: number;
  } | null = null;
  let bowl: { wickets: number; runs: number; overs: string } | null = null;

  for (const inn of inningsBuilt) {
    for (const b of inn.innings.battingFigures) {
      if (normalizeName(b.name) === norm && b.balls > 0) {
        bat = {
          runs: b.runs,
          balls: b.balls,
          fours: b.fours,
          sixes: b.sixes,
        };
      }
    }
    for (const bw of inn.innings.bowlingFigures) {
      if (normalizeName(bw.name) === norm) {
        bowl = {
          wickets: bw.wickets,
          runs: bw.runs,
          overs: bw.overs,
        };
      }
    }
  }

  const parts: string[] = [];
  if (bat) {
    parts.push(
      `${bat.runs} runs off ${bat.balls} balls • ${bat.fours} fours • ${bat.sixes} sixes`,
    );
  }
  if (bowl && bowl.wickets > 0) {
    parts.push(`${bowl.wickets} wickets for ${bowl.runs} runs`);
  } else if (bowl && !bat && bowl.runs >= 0) {
    parts.push(`${bowl.overs} overs • ${bowl.runs} runs conceded`);
  }

  return parts.length > 0 ? parts.join(" • ") : null;
}

export function buildPlayerOfMatchDisplay(
  playerOfMatchId: string | null,
  playerOfMatchName: string | null,
  opponentName: string,
  squad: ScorecardSquadMember[],
  inningsBuilt: ScorecardInningsBuilt[],
): PlayerOfMatchDisplay {
  if (!playerOfMatchId && !playerOfMatchName) {
    return {
      assigned: false,
      playerId: null,
      name: null,
      teamLabel: null,
      performanceSummary: null,
    };
  }

  const name = playerOfMatchName ?? "Player";
  const teamLabel = resolvePlayerOfMatchTeam(
    playerOfMatchId,
    name,
    opponentName,
    squad,
    inningsBuilt,
  );
  const performanceSummary = summarizePlayerMatchPerformance(
    name,
    inningsBuilt,
  );

  return {
    assigned: true,
    playerId: playerOfMatchId,
    name,
    teamLabel,
    performanceSummary,
  };
}
