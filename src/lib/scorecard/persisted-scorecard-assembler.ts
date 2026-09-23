import { deliveryRowToInput } from "@/lib/mappers/delivery";
import {
  buildFullMatchScorecard,
  type ScorecardSquadMember,
} from "@/lib/scorecard/build-scorecard";
import type { FullMatchScorecardData } from "@/lib/scorecard/types";
import type { Delivery, InningsRow, Match } from "@/lib/database/types";
import type { DeliveryInput } from "@/lib/scoring-engine/types";

type MatchScorecardRow = Match & {
  series: { name: string } | null;
  tournament: { name: string } | null;
  player_of_match: { full_name: string } | null;
};

export type PersistedSquadRow = {
  player_id: string;
  squad_status: string;
  is_captain: boolean;
  is_wicketkeeper: boolean;
  batting_position: number | null;
  created_at: string;
};

function playerNamesFromAllDeliveries(
  deliveriesByInningsId: Map<string, DeliveryInput[]>,
): Map<string, string> {
  const map = new Map<string, string>();
  const note = (id: string | null, name: string) => {
    if (!id) return;
    const trimmed = name.trim();
    if (!trimmed) return;
    if (!map.has(id)) map.set(id, trimmed);
  };
  for (const list of deliveriesByInningsId.values()) {
    for (const d of list) {
      note(d.strikerPlayerId, d.strikerName);
      note(d.nonStrikerPlayerId, d.nonStrikerName);
      note(d.bowlerPlayerId, d.bowlerName);
      note(d.dismissedPlayerId, d.dismissedPlayerName ?? "");
    }
  }
  return map;
}

function collectPlayerIds(
  squadRows: { player_id: string }[],
  deliveriesByInningsId: Map<string, DeliveryInput[]>,
): string[] {
  const ids = new Set<string>();
  for (const row of squadRows) ids.add(row.player_id);
  for (const list of deliveriesByInningsId.values()) {
    for (const d of list) {
      if (d.strikerPlayerId) ids.add(d.strikerPlayerId);
      if (d.nonStrikerPlayerId) ids.add(d.nonStrikerPlayerId);
      if (d.bowlerPlayerId) ids.add(d.bowlerPlayerId);
      if (d.dismissedPlayerId) ids.add(d.dismissedPlayerId);
    }
  }
  return [...ids];
}

export function deliveriesByInningsFromRows(
  innings: InningsRow[],
  deliveryRows: Delivery[],
): Map<string, DeliveryInput[]> {
  const deliveriesByInningsId = new Map<string, DeliveryInput[]>();
  for (const inn of innings) {
    deliveriesByInningsId.set(inn.id, []);
  }
  for (const row of deliveryRows) {
    deliveriesByInningsId.get(row.innings_id)?.push(deliveryRowToInput(row));
  }
  return deliveriesByInningsId;
}

export function buildSquadMembersFromPersisted(
  squadRows: PersistedSquadRow[],
  deliveryNameByPlayerId: Map<string, string>,
  playersFromDb?: {
    id: string;
    full_name: string;
    jersey_number: number | null;
    is_official_squad: boolean | null;
  }[],
): ScorecardSquadMember[] {
  const playerMap = new Map(
    (playersFromDb ?? []).map((p) => [
      p.id,
      {
        fullName: p.full_name,
        jerseyNumber: p.jersey_number,
        isGuest: p.is_official_squad === false,
      },
    ]),
  );

  return squadRows
    .map((row, index) => {
      const meta = playerMap.get(row.player_id);
      const fallbackName = deliveryNameByPlayerId.get(row.player_id);
      const fullName = meta?.fullName ?? fallbackName;
      if (!fullName) return null;
      return {
        playerId: row.player_id,
        fullName,
        jerseyNumber: meta?.jerseyNumber ?? null,
        isCaptain: row.is_captain,
        isWicketkeeper: row.is_wicketkeeper,
        squadStatus: row.squad_status as "playing_xi" | "bench",
        isGuest: meta?.isGuest ?? false,
        battingPosition: row.batting_position ?? null,
        squadOrder: index,
      };
    })
    .filter((m): m is ScorecardSquadMember => m != null);
}

export function buildScorecardFromParts(
  match: MatchScorecardRow,
  innings: InningsRow[],
  squadRows: PersistedSquadRow[],
  deliveriesByInningsId: Map<string, DeliveryInput[]>,
  deliveryNameByPlayerId: Map<string, string>,
  playersFromDb?: {
    id: string;
    full_name: string;
    jersey_number: number | null;
    is_official_squad: boolean | null;
  }[],
): FullMatchScorecardData {
  const squad = buildSquadMembersFromPersisted(
    squadRows,
    deliveryNameByPlayerId,
    playersFromDb,
  );

  return buildFullMatchScorecard({
    match: match as Match,
    seriesName: match.series?.name ?? null,
    tournamentName: match.tournament?.name ?? null,
    playerOfMatchId: match.player_of_match_id,
    playerOfMatchName: match.player_of_match?.full_name ?? null,
    squad,
    innings,
    deliveriesByInningsId,
  });
}

/** For tests and server-side rebuild when rows are already loaded. */
export function buildScorecardFromPersistedRows(input: {
  match: MatchScorecardRow;
  innings: InningsRow[];
  squadRows: PersistedSquadRow[];
  deliveryRows: Delivery[];
  players: {
    id: string;
    full_name: string;
    jersey_number: number | null;
    is_official_squad: boolean | null;
  }[];
}): FullMatchScorecardData {
  const deliveriesByInningsId = deliveriesByInningsFromRows(
    input.innings,
    input.deliveryRows,
  );
  const deliveryNameByPlayerId =
    playerNamesFromAllDeliveries(deliveriesByInningsId);
  return buildScorecardFromParts(
    input.match,
    input.innings,
    input.squadRows,
    deliveriesByInningsId,
    deliveryNameByPlayerId,
    input.players,
  );
}

export { collectPlayerIds, playerNamesFromAllDeliveries };
