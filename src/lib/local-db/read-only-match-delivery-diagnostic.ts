"use client";

import { fetchServerDeliveriesForMatch } from "@/lib/local-db/fetch-server-deliveries";
import {
  buildLocalOnlyDetails,
  classifySyncFailureReason,
  compareDeliveriesByClientEventId,
  type InningsDeliveryCompareReport,
  type LocalOnlyDeliveryDetail,
} from "@/lib/local-db/local-server-delivery-compare";
import { loadScoringBootstrapCacheBySlug } from "@/lib/local-db/scoring-bootstrap-cache";
import {
  getLocalDb,
  type LocalDeliveryRecord,
  type SyncQueueItem,
} from "@/lib/local-db/schema";
import {
  createApiDeliveryPusher,
  flushSyncQueueUntilIdle,
  requeueRetryableFailedForMatch,
} from "@/lib/sync/delivery-sync";

export type { InningsDeliveryCompareReport, LocalOnlyDeliveryDetail };
export { classifySyncFailureReason };

export type LocalDeliveryDiagnosticReport = {
  databaseName: string;
  objectStoreNames: string[];
  shareSlug: string;
  matchId: string | null;
  matchIdSource: "bootstrap_cache" | "matches_meta" | "none";
  deliveries: {
    total: number;
    byInningsLabel: { label: string; inningsId: string; count: number }[];
    syncedCount: number;
    unsyncedCount: number;
    withClientEventId: number;
    withMatchId: number;
    withInningsId: number;
    byExtraType: Record<string, number>;
    wicketDeliveryCount: number;
    legalDeliveryCount: number;
    hasScoringFields: boolean;
  };
  syncQueue: {
    total: number;
    pendingTotal: number;
    byInningsLabel: { label: string; inningsId: string; count: number }[];
    pendingByInningsLabel: { label: string; inningsId: string; count: number }[];
    byStatus: Record<string, number>;
    withClientEventId: number;
    withMatchId: number;
    withInningsId: number;
  };
  status: "LOCAL_DATA_FOUND" | "NO_LOCAL_DELIVERY_DATA_FOUND";
};

export type LocalServerCompareReport = {
  matchId: string;
  shareSlug: string;
  byInnings: InningsDeliveryCompareReport[];
  serverFetchError: string | null;
};

function inningsLabelsFromBootstrap(
  bootstrap: Awaited<ReturnType<typeof loadScoringBootstrapCacheBySlug>>,
): { id: string; label: string }[] {
  if (!bootstrap?.innings?.length) return [];
  return [...bootstrap.innings]
    .sort((a, b) => a.inningsNumber - b.inningsNumber)
    .map((inn) => ({
      id: inn.id,
      label: `Innings ${inn.inningsNumber}`,
    }));
}

function countByInningsId<T extends { innings_id: string }>(
  rows: T[],
): Record<string, number> {
  const map: Record<string, number> = {};
  for (const row of rows) {
    map[row.innings_id] = (map[row.innings_id] ?? 0) + 1;
  }
  return map;
}

export function buildInningsBreakdown(
  byInningsId: Record<string, number>,
  inningsOrder: { id: string; label: string }[],
): { label: string; inningsId: string; count: number }[] {
  const seen = new Set<string>();
  const rows: { label: string; inningsId: string; count: number }[] = [];

  for (const inn of inningsOrder) {
    seen.add(inn.id);
    rows.push({
      label: inn.label,
      inningsId: inn.id,
      count: byInningsId[inn.id] ?? 0,
    });
  }

  for (const [inningsId, count] of Object.entries(byInningsId)) {
    if (seen.has(inningsId)) continue;
    rows.push({
      label: `Unknown innings (${inningsId.slice(0, 8)}…)`,
      inningsId,
      count,
    });
  }

  return rows;
}

export function summarizeLocalDeliveries(
  deliveries: LocalDeliveryRecord[],
  inningsOrder: { id: string; label: string }[],
): LocalDeliveryDiagnosticReport["deliveries"] {
  const byInningsId = countByInningsId(deliveries);
  let withClientEventId = 0;
  let withMatchId = 0;
  let withInningsId = 0;
  let syncedCount = 0;
  let wicketDeliveryCount = 0;
  let legalDeliveryCount = 0;
  const byExtraType: Record<string, number> = {};

  for (const d of deliveries) {
    if (d.client_event_id?.trim()) withClientEventId++;
    if (d.match_id?.trim()) withMatchId++;
    if (d.innings_id?.trim()) withInningsId++;
    if (d.synced) syncedCount++;
    if (d.is_wicket) wicketDeliveryCount++;
    if (d.is_legal_delivery) legalDeliveryCount++;
    const extra = d.extra_type ?? "unknown";
    byExtraType[extra] = (byExtraType[extra] ?? 0) + 1;
  }

  const hasScoringFields =
    deliveries.length > 0 &&
    deliveries.some(
      (d) =>
        d.total_runs > 0 ||
        d.batter_runs > 0 ||
        d.is_wicket ||
        d.is_legal_delivery,
    );

  return {
    total: deliveries.length,
    byInningsLabel: buildInningsBreakdown(byInningsId, inningsOrder),
    syncedCount,
    unsyncedCount: deliveries.length - syncedCount,
    withClientEventId,
    withMatchId,
    withInningsId,
    byExtraType,
    wicketDeliveryCount,
    legalDeliveryCount,
    hasScoringFields,
  };
}

export function summarizeSyncQueue(
  items: SyncQueueItem[],
  inningsOrder: { id: string; label: string }[],
): LocalDeliveryDiagnosticReport["syncQueue"] {
  const byInningsId = countByInningsId(items);
  const pending = items.filter((i) => i.status === "pending");
  const pendingByInningsId = countByInningsId(pending);
  const byStatus: Record<string, number> = {};
  let withClientEventId = 0;
  let withMatchId = 0;
  let withInningsId = 0;

  for (const item of items) {
    byStatus[item.status] = (byStatus[item.status] ?? 0) + 1;
    if (item.client_event_id?.trim()) withClientEventId++;
    if (item.match_id?.trim()) withMatchId++;
    if (item.innings_id?.trim()) withInningsId++;
  }

  return {
    total: items.length,
    pendingTotal: pending.length,
    byInningsLabel: buildInningsBreakdown(byInningsId, inningsOrder),
    pendingByInningsLabel: buildInningsBreakdown(
      pendingByInningsId,
      inningsOrder,
    ),
    byStatus,
    withClientEventId,
    withMatchId,
    withInningsId,
  };
}

/** Read-only IndexedDB inspection for one share slug. Does not write or sync. */
export async function inspectLocalMatchDeliveries(
  shareSlug: string,
  options?: { matchIdOverride?: string },
): Promise<LocalDeliveryDiagnosticReport> {
  const db = getLocalDb();
  const databaseName = db.name;
  const objectStoreNames = db.tables.map((t) => t.name);

  let matchId = options?.matchIdOverride?.trim() || null;
  let matchIdSource: LocalDeliveryDiagnosticReport["matchIdSource"] = "none";

  const bootstrap = await loadScoringBootstrapCacheBySlug(shareSlug);
  if (!matchId && bootstrap?.matchId) {
    matchId = bootstrap.matchId;
    matchIdSource = "bootstrap_cache";
  }

  if (!matchId) {
    const meta = await db.matches.where("share_slug").equals(shareSlug).first();
    if (meta?.match_id) {
      matchId = meta.match_id;
      matchIdSource = "matches_meta";
    }
  }

  const inningsOrder = inningsLabelsFromBootstrap(bootstrap);

  let deliveries: LocalDeliveryRecord[] = [];
  let syncItems: SyncQueueItem[] = [];

  if (matchId) {
    deliveries = await db.deliveries.where("match_id").equals(matchId).toArray();
    syncItems = await db.syncQueue.where("match_id").equals(matchId).toArray();
  }

  const deliverySummary = summarizeLocalDeliveries(deliveries, inningsOrder);
  const syncSummary = summarizeSyncQueue(syncItems, inningsOrder);

  return {
    databaseName,
    objectStoreNames,
    shareSlug,
    matchId,
    matchIdSource,
    deliveries: deliverySummary,
    syncQueue: syncSummary,
    status:
      deliverySummary.total > 0
        ? "LOCAL_DATA_FOUND"
        : "NO_LOCAL_DELIVERY_DATA_FOUND",
  };
}

function inningsNumberForId(
  inningsId: string,
  bootstrap: Awaited<ReturnType<typeof loadScoringBootstrapCacheBySlug>>,
): number | null {
  const row = bootstrap?.innings?.find((i) => i.id === inningsId);
  return row?.inningsNumber ?? null;
}

/** Read-only local vs Supabase compare by client_event_id (browser only). */
export async function compareLocalServerMatchDeliveries(
  shareSlug: string,
  options?: { matchIdOverride?: string; inningsNumber?: number },
): Promise<LocalServerCompareReport> {
  const db = getLocalDb();
  let matchId = options?.matchIdOverride?.trim() || null;
  const bootstrap = await loadScoringBootstrapCacheBySlug(shareSlug);
  if (!matchId && bootstrap?.matchId) matchId = bootstrap.matchId;
  if (!matchId) {
    const meta = await db.matches.where("share_slug").equals(shareSlug).first();
    matchId = meta?.match_id ?? null;
  }
  if (!matchId) {
    throw new Error("Could not resolve match ID for compare");
  }

  const localDeliveries = await db.deliveries
    .where("match_id")
    .equals(matchId)
    .toArray();
  const syncItems = await db.syncQueue.where("match_id").equals(matchId).toArray();

  let serverRows: Awaited<ReturnType<typeof fetchServerDeliveriesForMatch>> =
    [];
  let serverFetchError: string | null = null;
  try {
    serverRows = await fetchServerDeliveriesForMatch(matchId);
  } catch (err) {
    serverFetchError =
      err instanceof Error ? err.message : "Server delivery fetch failed";
  }

  const inningsIds = new Set<string>();
  for (const d of localDeliveries) inningsIds.add(d.innings_id);
  for (const s of serverRows) inningsIds.add(s.innings_id);

  const filterInnings = options?.inningsNumber;
  const byInnings: InningsDeliveryCompareReport[] = [];

  for (const inningsId of inningsIds) {
    const innNum = inningsNumberForId(inningsId, bootstrap);
    if (filterInnings != null && innNum !== filterInnings) continue;

    const localInn = localDeliveries.filter((d) => d.innings_id === inningsId);
    const serverInn = serverRows.filter((d) => d.innings_id === inningsId);
    const compared = compareDeliveriesByClientEventId(localInn, serverInn);
    byInnings.push({
      inningsId,
      inningsNumber: innNum,
      ...compared,
      localOnlyDetails: buildLocalOnlyDetails(
        localDeliveries,
        compared.localOnlyClientEventIds,
        syncItems,
      ),
    });
  }

  byInnings.sort(
    (a, b) => (a.inningsNumber ?? 99) - (b.inningsNumber ?? 99),
  );

  return {
    matchId,
    shareSlug,
    byInnings,
    serverFetchError,
  };
}

/** Push one local-only delivery (lowest sequence first) via existing API. */
export async function syncOneLocalOnlyDelivery(
  shareSlug: string,
  inningsNumber: number,
): Promise<
  | { ok: true; client_event_id: string; sequence_in_innings: number }
  | { ok: false; reason: string }
> {
  const report = await compareLocalServerMatchDeliveries(shareSlug, {
    inningsNumber,
  });
  const inn = report.byInnings.find((i) => i.inningsNumber === inningsNumber);
  if (!inn?.localOnlyDetails.length) {
    return { ok: false, reason: "No local-only deliveries for this innings" };
  }
  const next = inn.localOnlyDetails[0]!;
  const db = getLocalDb();
  const queueRow = await db.syncQueue
    .where("client_event_id")
    .equals(next.client_event_id)
    .first();
  const payload = queueRow?.payload;
  if (!payload) {
    return {
      ok: false,
      reason: "Local-only delivery has no syncQueue payload",
    };
  }
  const push = await createApiDeliveryPusher();
  await push(payload);

  const serverRows = await fetchServerDeliveriesForMatch(report.matchId);
  const onServer = serverRows.some(
    (r) => r.client_event_id === next.client_event_id,
  );
  if (!onServer) {
    return {
      ok: false,
      reason:
        "POST succeeded but client_event_id not found on server (verify session/controller)",
    };
  }

  await db.syncQueue
    .where("client_event_id")
    .equals(next.client_event_id)
    .modify({ status: "synced", updated_at: new Date().toISOString() });
  await db.deliveries
    .where("client_event_id")
    .equals(next.client_event_id)
    .modify({ synced: true });
  return {
    ok: true,
    client_event_id: next.client_event_id,
    sequence_in_innings: next.sequence_in_innings,
  };
}

/** Requeue failed + flush using existing delivery sync (controller session required). */
export async function runMatchDeliveryBackfillRecovery(
  matchId: string,
): Promise<{ ok: boolean; pending: number }> {
  await requeueRetryableFailedForMatch(matchId);
  const result = await flushSyncQueueUntilIdle(await createApiDeliveryPusher(), {
    maxRounds: 24,
    matchId,
  });
  return result.ok
    ? { ok: true, pending: 0 }
    : { ok: false, pending: result.pending };
}
