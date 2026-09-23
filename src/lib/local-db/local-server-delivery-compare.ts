import type {
  LocalDeliveryRecord,
  SyncQueueItem,
} from "@/lib/local-db/schema";

export type ServerDeliveryRef = {
  client_event_id: string;
  sequence_in_innings: number;
};

export type LocalOnlyDeliveryDetail = {
  client_event_id: string;
  sequence_in_innings: number;
  striker_name: string;
  striker_player_id: string | null;
  non_striker_name: string;
  non_striker_player_id: string | null;
  bowler_name: string;
  bowler_player_id: string | null;
  batter_runs: number;
  total_runs: number;
  extra_type: LocalDeliveryRecord["extra_type"];
  extras_runs: number;
  is_legal_delivery: boolean;
  is_wicket: boolean;
  wicket_type: string | null;
  dismissed_player_id: string | null;
  dismissed_player_name: string | null;
  local_created_at: string;
  local_synced_flag: boolean;
  syncQueue: {
    status: string;
    attempts: number;
    last_error: string | null;
  } | null;
};

export type InningsDeliveryCompareReport = {
  inningsId: string;
  inningsNumber: number | null;
  localCount: number;
  serverCount: number;
  localOnlyClientEventIds: string[];
  serverOnlyClientEventIds: string[];
  localOnlyDetails: LocalOnlyDeliveryDetail[];
};

export function compareDeliveriesByClientEventId(
  local: LocalDeliveryRecord[],
  server: ServerDeliveryRef[],
): Pick<
  InningsDeliveryCompareReport,
  | "localCount"
  | "serverCount"
  | "localOnlyClientEventIds"
  | "serverOnlyClientEventIds"
> {
  const localIds = new Set(
    local.map((d) => d.client_event_id).filter(Boolean),
  );
  const serverIds = new Set(
    server.map((d) => d.client_event_id).filter(Boolean),
  );

  const localOnly: string[] = [];
  for (const id of localIds) {
    if (!serverIds.has(id)) localOnly.push(id);
  }
  localOnly.sort();

  const serverOnly: string[] = [];
  for (const id of serverIds) {
    if (!localIds.has(id)) serverOnly.push(id);
  }
  serverOnly.sort();

  return {
    localCount: localIds.size,
    serverCount: serverIds.size,
    localOnlyClientEventIds: localOnly,
    serverOnlyClientEventIds: serverOnly,
  };
}

export function buildLocalOnlyDetails(
  localDeliveries: LocalDeliveryRecord[],
  localOnlyIds: readonly string[],
  syncQueue: SyncQueueItem[],
): LocalOnlyDeliveryDetail[] {
  const queueByClient = new Map(
    syncQueue.map((q) => [q.client_event_id, q] as const),
  );
  const localByClient = new Map(
    localDeliveries.map((d) => [d.client_event_id, d] as const),
  );

  const details: LocalOnlyDeliveryDetail[] = [];
  for (const id of localOnlyIds) {
    const d = localByClient.get(id);
    if (!d) continue;
    const q = queueByClient.get(id);
    details.push({
      client_event_id: d.client_event_id,
      sequence_in_innings: d.sequence_in_innings,
      striker_name: d.striker_name,
      striker_player_id: d.striker_player_id ?? null,
      non_striker_name: d.non_striker_name,
      non_striker_player_id: d.non_striker_player_id ?? null,
      bowler_name: d.bowler_name,
      bowler_player_id: d.bowler_player_id ?? null,
      batter_runs: d.batter_runs,
      total_runs: d.total_runs,
      extra_type: d.extra_type,
      extras_runs: d.extras_runs,
      is_legal_delivery: d.is_legal_delivery,
      is_wicket: d.is_wicket,
      wicket_type: d.wicket_type,
      dismissed_player_id: d.dismissed_player_id ?? null,
      dismissed_player_name: d.dismissed_player_name ?? null,
      local_created_at: d.created_at,
      local_synced_flag: d.synced,
      syncQueue: q
        ? {
            status: q.status,
            attempts: q.attempts,
            last_error: q.last_error,
          }
        : null,
    });
  }
  details.sort((a, b) => a.sequence_in_innings - b.sequence_in_innings);
  return details;
}

export function classifySyncFailureReason(
  lastError: string | null,
): string {
  if (!lastError) return "unknown";
  const e = lastError.toLowerCase();
  if (e.includes("23503") || e.includes("foreign key")) return "fk_23503";
  if (e.includes("session_invalid") || e.includes("session_required")) {
    return "session_invalid";
  }
  if (
    e.includes("not the active scoring controller") ||
    e.includes("not_scoring_controller")
  ) {
    return "controller_race_403";
  }
  if (e.includes("invalid_bowler") || e.includes("consecutive overs")) {
    return "invalid_bowler_gap_or_rule";
  }
  if (e.includes("network") || e.includes("failed to fetch")) {
    return "network_failure";
  }
  if (e.includes("match_removed") || e.includes("deleted")) {
    return "match_removed";
  }
  return "other_server_or_client_error";
}
