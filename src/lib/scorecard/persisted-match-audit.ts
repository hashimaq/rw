import { deliveryRowToInput } from "@/lib/mappers/delivery";
import { buildFullMatchScorecard } from "@/lib/scorecard/build-scorecard";
import { battingOrder, bowlingOrder } from "@/lib/scorecard/innings-player-order";
import type { Delivery, InningsRow, Match } from "@/lib/database/types";
import {
  buildInningsStateFromDeliveries,
  liveSummary,
} from "@/lib/scoring-engine";
import { participantKey, strikeRate, oversFromLegalBalls, economy } from "@/lib/scoring-engine/utils";

export type DeliveryRowAudit = {
  sequence_in_innings: number;
  client_event_id: string;
  striker_player_id: string | null;
  striker_name: string;
  non_striker_player_id: string | null;
  non_striker_name: string;
  bowler_player_id: string | null;
  bowler_name: string;
  batter_runs: number;
  total_runs: number;
  extras_runs: number;
  extra_type: string;
  is_legal_delivery: boolean;
  is_wicket: boolean;
  wicket_type: string | null;
  dismissed_player_id: string | null;
  dismissed_player_name: string | null;
  created_at: string;
};

export function auditInningsDeliveries(rows: DeliveryRowAudit[]) {
  const sorted = [...rows].sort(
    (a, b) => a.sequence_in_innings - b.sequence_in_innings,
  );
  const seqs = sorted.map((r) => r.sequence_in_innings);
  const clientIds = sorted.map((r) => r.client_event_id);
  const uniqueClient = new Set(clientIds);
  const dupClient = clientIds.length - uniqueClient.size;

  const missingSeq: number[] = [];
  if (seqs.length > 0) {
    const min = Math.min(...seqs);
    const max = Math.max(...seqs);
    for (let s = min; s <= max; s++) {
      if (!seqs.includes(s)) missingSeq.push(s);
    }
  }

  return {
    count: sorted.length,
    minSequence: seqs[0] ?? null,
    maxSequence: seqs.at(-1) ?? null,
    uniqueClientEventIds: uniqueClient.size,
    duplicateClientEventIds: dupClient,
    missingSequenceNumbers: missingSeq,
    sumTotalRuns: sorted.reduce((s, r) => s + r.total_runs, 0),
    wicketFlags: sorted.filter((r) => r.is_wicket).length,
    last5: sorted.slice(-5).map(formatDeliveryLine),
    last: sorted.at(-1) ? formatDeliveryLine(sorted.at(-1)!) : null,
  };
}

function formatDeliveryLine(r: DeliveryRowAudit): string {
  return [
    `seq=${r.sequence_in_innings}`,
    `st=${r.striker_name}${r.striker_player_id ? "" : " (id=null)"}`,
    `bowl=${r.bowler_name}`,
    `br=${r.batter_runs}`,
    `tot=${r.total_runs}`,
    `ex=${r.extra_type}+${r.extras_runs}`,
    `wkt=${r.is_wicket ? r.wicket_type : "-"}`,
    `legal=${r.is_legal_delivery}`,
    `ce=${r.client_event_id.slice(0, 8)}…`,
  ].join(" | ");
}

export function engineBattingTable(
  deliveries: ReturnType<typeof deliveryRowToInput>[],
  oversLimit: number,
  target: number | null,
) {
  const state = buildInningsStateFromDeliveries(
    deliveries,
    oversLimit,
    target,
  );
  return battingOrder(state).map((b) => ({
    key: participantKey(b.playerId, b.name),
    name: b.name,
    playerId: b.playerId,
    runs: b.runs,
    balls: b.balls,
    fours: b.fours,
    sixes: b.sixes,
    sr: strikeRate(b.runs, b.balls),
    out: b.isOut,
  }));
}

export function engineBowlingTable(
  deliveries: ReturnType<typeof deliveryRowToInput>[],
  oversLimit: number,
  target: number | null,
) {
  const state = buildInningsStateFromDeliveries(
    deliveries,
    oversLimit,
    target,
  );
  return bowlingOrder(state).map((b) => ({
    key: participantKey(b.playerId, b.name),
    name: b.name,
    playerId: b.playerId,
    overs: oversFromLegalBalls(b.legalBalls),
    legalBalls: b.legalBalls,
    maidens: b.maidens,
    runs: b.runsConceded,
    wickets: b.wickets,
    nb: b.noBallsBowled,
    wd: b.widesBowled,
    eco: economy(b.runsConceded, b.legalBalls),
  }));
}

export function scorecardBattingTable(
  doc: ReturnType<typeof buildFullMatchScorecard>["innings"][number]["innings"],
) {
  return doc.battingFigures.map((b) => ({
    name: b.name,
    runs: b.runs,
    balls: b.balls,
    fours: b.fours,
    sixes: b.sixes,
    sr: b.strikeRate,
    didNotBat: b.didNotBat ?? false,
  }));
}

export function participantIdAudit(rows: DeliveryRowAudit[]) {
  const note = (id: string | null, name: string, role: string) => ({
    role,
    name,
    player_id: id,
    kind: id ? "uuid" : "name-only",
  });
  const out: ReturnType<typeof note>[] = [];
  for (const r of rows) {
    out.push(note(r.striker_player_id, r.striker_name, "striker"));
    out.push(note(r.bowler_player_id, r.bowler_name, "bowler"));
    if (r.is_wicket && r.dismissed_player_name) {
      out.push(
        note(
          r.dismissed_player_id,
          r.dismissed_player_name,
          "dismissed",
        ),
      );
    }
  }
  return out;
}

export function buildAuditReport(input: {
  innings: InningsRow[];
  deliveryRows: Delivery[];
  match: Match;
  squad: Parameters<typeof buildFullMatchScorecard>[0]["squad"];
  seriesName: string | null;
  tournamentName: string | null;
}) {
  const byInn = new Map<string, DeliveryRowAudit[]>();
  for (const inn of input.innings) byInn.set(inn.id, []);
  for (const row of input.deliveryRows) {
    const audit: DeliveryRowAudit = {
      sequence_in_innings: row.sequence_in_innings,
      client_event_id: row.client_event_id,
      striker_player_id: row.striker_player_id,
      striker_name: row.striker_name,
      non_striker_player_id: row.non_striker_player_id,
      non_striker_name: row.non_striker_name,
      bowler_player_id: row.bowler_player_id,
      bowler_name: row.bowler_name,
      batter_runs: row.batter_runs,
      total_runs: row.total_runs,
      extras_runs: row.extras_runs,
      extra_type: row.extra_type,
      is_legal_delivery: row.is_legal_delivery,
      is_wicket: row.is_wicket,
      wicket_type: row.wicket_type,
      dismissed_player_id: row.dismissed_player_id,
      dismissed_player_name: row.dismissed_player_name,
      created_at: row.created_at,
    };
    byInn.get(row.innings_id)?.push(audit);
  }

  const deliveriesByInningsId = new Map<
    string,
    ReturnType<typeof deliveryRowToInput>[]
  >();
  for (const row of input.deliveryRows) {
    const list = deliveriesByInningsId.get(row.innings_id) ?? [];
    list.push(deliveryRowToInput(row));
    deliveriesByInningsId.set(row.innings_id, list);
  }

  const scorecard = buildFullMatchScorecard({
    match: input.match,
    seriesName: input.seriesName,
    tournamentName: input.tournamentName,
    playerOfMatchId: null,
    playerOfMatchName: null,
    squad: input.squad,
    innings: input.innings,
    deliveriesByInningsId,
  });

  const inningsReports = input.innings.map((inn) => {
    const rows = byInn.get(inn.id) ?? [];
    const inputs = deliveriesByInningsId.get(inn.id) ?? [];
    const state = buildInningsStateFromDeliveries(
      inputs,
      inn.overs_limit,
      inn.target,
    );
    const summary = liveSummary(state);
    const scInn = scorecard.innings.find(
      (i) => i.inningsNumber === inn.innings_number,
    )!.innings;

    return {
      inningsNumber: inn.innings_number,
      battingTeam: inn.batting_team,
      deliveryAudit: auditInningsDeliveries(rows),
      storedSummary: {
        total_runs: inn.total_runs,
        wickets: inn.wickets,
      },
      engineDerived: {
        totalRuns: state.totalRuns,
        wickets: state.wickets,
        overs: summary.oversDisplay,
        extras: state.extras,
      },
      engineBatting: engineBattingTable(inputs, inn.overs_limit, inn.target),
      engineBowling: engineBowlingTable(inputs, inn.overs_limit, inn.target),
      scorecardBatting: scorecardBattingTable(scInn),
      scorecardBowling: scInn.bowlingFigures.map((b) => ({
        name: b.name,
        overs: b.overs,
        runs: b.runs,
        wickets: b.wickets,
        wides: b.wides,
        noBalls: b.noBalls,
        economy: b.economy,
      })),
      nullIdStrikerDeliveries: rows.filter((r) => !r.striker_player_id).length,
      nullIdBowlerDeliveries: rows.filter((r) => !r.bowler_player_id).length,
    };
  });

  return { inningsReports, resultSummary: scorecard.document.resultSummary };
}
