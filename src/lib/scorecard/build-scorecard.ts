import type {
  DeliveryInput,
  InningsScoreState,
} from "@/lib/scoring-engine/types";
import {
  buildInningsStateFromDeliveries,
  liveSummary,
} from "@/lib/scoring-engine";
import { formatDeliveryLabel } from "@/lib/scoring-engine/format-ball";
import {
  economy,
  oversFromLegalBalls,
} from "@/lib/scoring-engine/utils";
import type { InningsRow, Match } from "@/lib/database/types";
import { groupDeliveriesByOver } from "@/lib/scorecard/group-deliveries-by-over";
import { isScoringMetaDelivery } from "@/lib/scoring/scoring-meta-delivery";
import { buildScorecardBattingFigures } from "@/lib/scorecard/scorecard-batting-xi";
import { bowlingOrder } from "@/lib/scorecard/innings-player-order";
import { formatMatchTossSummary } from "@/lib/scorecard/toss-summary";
import { buildPlayerOfMatchDisplay } from "@/lib/scorecard/player-of-match-display";
import { resultSummaryFromPersistedMatch } from "@/lib/scoring/derive-match-result";
import type {
  FullMatchScorecardData,
  ScorecardInningsBuilt,
  ScorecardInningsDocument,
  ScorecardOverSummary,
} from "@/lib/scorecard/types";

export interface ScorecardSquadMember {
  playerId: string;
  fullName: string;
  jerseyNumber: number | null;
  isCaptain: boolean;
  isWicketkeeper: boolean;
  squadStatus: "playing_xi" | "bench";
  isGuest: boolean;
  battingPosition: number | null;
  squadOrder: number;
}

export interface BuildFullMatchScorecardInput {
  match: Match;
  seriesName: string | null;
  tournamentName: string | null;
  playerOfMatchId: string | null;
  playerOfMatchName: string | null;
  squad: ScorecardSquadMember[];
  innings: InningsRow[];
  deliveriesByInningsId: Map<string, DeliveryInput[]>;
}

function formatFowOver(overNumber: number, ballNumber: number): string {
  return `${overNumber + 1}.${ballNumber}`;
}

function buildOverByOver(deliveries: DeliveryInput[]): ScorecardOverSummary[] {
  const scoring = deliveries.filter((d) => !isScoringMetaDelivery(d));
  return groupDeliveriesByOver(scoring).map(([overNumber, balls]) => ({
    overNumber,
    displayOverNumber: overNumber + 1,
    runs: balls.reduce((sum, d) => sum + d.totalRuns, 0),
    balls: balls
      .map((d) => ({
        clientEventId: d.clientEventId,
        label: formatDeliveryLabel(d),
      }))
      .filter((b) => b.label.length > 0),
  }));
}

function collectPartnerships(state: InningsScoreState) {
  const list = [...state.partnerships];
  if (state.activePartnership) {
    list.push({ ...state.activePartnership });
  }
  return list.map((p) => ({
    batters: [p.batter1Name, p.batter2Name] as [string, string],
    runs: p.runs,
    balls: p.balls,
  }));
}

function buildInningsDocument(
  state: InningsScoreState,
  inningsRow: InningsRow,
  guestPlayerIds: ReadonlySet<string>,
  squad: ScorecardSquadMember[],
  allInnings: InningsRow[],
  deliveriesByInningsId: Map<string, DeliveryInput[]>,
): ScorecardInningsDocument {
  const summary = liveSummary(state);
  const crr =
    summary.crr != null && Number.isFinite(summary.crr) ? summary.crr : null;

  return {
    inningsNumber: inningsRow.innings_number,
    battingTeam: inningsRow.batting_team,
    bowlingTeam: inningsRow.bowling_team,
    totalRuns: state.totalRuns,
    wickets: state.wickets,
    overs: summary.oversDisplay,
    extras: state.extras,
    extrasBreakdown: { ...state.extrasBreakdown },
    runRate: crr,
    target: state.target,
    battingFigures: buildScorecardBattingFigures(
      state,
      inningsRow,
      squad,
      guestPlayerIds,
      allInnings,
      deliveriesByInningsId,
    ),
    bowlingFigures: bowlingOrder(state).map((b) => ({
      name: b.name,
      playerId: b.playerId,
      overs: oversFromLegalBalls(b.legalBalls),
      maidens: b.maidens,
      runs: b.runsConceded,
      wickets: b.wickets,
      wides: b.widesBowled,
      noBalls: b.noBallsBowled,
      economy: economy(b.runsConceded, b.legalBalls),
    })),
    fallOfWickets: state.fallOfWickets.map((f) => ({
      wicketNumber: f.wicketNumber,
      score: f.scoreAtWicket,
      batter: f.dismissedPlayerName,
      over: formatFowOver(f.overNumber, f.ballNumber),
    })),
    partnerships: collectPartnerships(state),
  };
}

function buildInningsBuilt(
  inningsRow: InningsRow,
  deliveries: DeliveryInput[],
  guestPlayerIds: ReadonlySet<string>,
  squad: ScorecardSquadMember[],
  allInnings: InningsRow[],
  deliveriesByInningsId: Map<string, DeliveryInput[]>,
): ScorecardInningsBuilt {
  const state = buildInningsStateFromDeliveries(
    deliveries,
    inningsRow.overs_limit,
    inningsRow.target,
  );
  return {
    inningsId: inningsRow.id,
    inningsNumber: inningsRow.innings_number,
    battingTeam: inningsRow.batting_team,
    bowlingTeam: inningsRow.bowling_team,
    inningsStatus: inningsRow.innings_status,
    target: inningsRow.target,
    oversLimit: inningsRow.overs_limit,
    persistedTotalRuns: inningsRow.total_runs,
    persistedWickets: inningsRow.wickets,
    innings: buildInningsDocument(
      state,
      inningsRow,
      guestPlayerIds,
      squad,
      allInnings,
      deliveriesByInningsId,
    ),
    overByOver: buildOverByOver(deliveries),
  };
}

/** Rebuild full match scorecard from loaded rows (no I/O). */
export function buildFullMatchScorecard(
  input: BuildFullMatchScorecardInput,
): FullMatchScorecardData {
  const guestPlayerIds = new Set(
    input.squad.filter((m) => m.isGuest).map((m) => m.playerId),
  );

  const sortedInnings = [...input.innings].sort(
    (a, b) => a.innings_number - b.innings_number,
  );

  const inningsBuilt = sortedInnings.map((row) => {
    const deliveries = input.deliveriesByInningsId.get(row.id) ?? [];
    return buildInningsBuilt(
      row,
      deliveries,
      guestPlayerIds,
      input.squad,
      sortedInnings,
      input.deliveriesByInningsId,
    );
  });

  const playingXi = input.squad
    .filter((m) => m.squadStatus === "playing_xi")
    .sort((a, b) => {
      const ja = a.jerseyNumber ?? 9999;
      const jb = b.jerseyNumber ?? 9999;
      if (ja !== jb) return ja - jb;
      return a.fullName.localeCompare(b.fullName);
    });

  const document = {
    matchNumber: input.match.match_number,
    matchDate: input.match.match_date,
    venue: input.match.venue,
    opponent: input.match.opponent_name,
    seriesName: input.seriesName,
    tournamentName: input.tournamentName,
    tossSummary: formatMatchTossSummary(input.match),
    redWingsPlayingXi: playingXi.map((m) => ({
      name: m.fullName,
      jerseyNumber: m.jerseyNumber ?? 0,
      isCaptain: m.isCaptain,
      isWicketkeeper: m.isWicketkeeper,
    })),
    innings: inningsBuilt.map((i) => i.innings),
    resultSummary: resultSummaryFromPersistedMatch(input.match),
    playerOfTheMatch: input.playerOfMatchName,
    matchSummary: null as string | null,
  };

  const playerOfTheMatch = buildPlayerOfMatchDisplay(
    input.playerOfMatchId,
    input.playerOfMatchName,
    input.match.opponent_name,
    input.squad,
    inningsBuilt,
  );

  return {
    matchId: input.match.id,
    shareSlug: input.match.share_slug,
    status: input.match.status,
    document,
    innings: inningsBuilt,
    playerOfTheMatch,
  };
}
