"use client";

import { useCallback, useEffect, useState } from "react";
import {
  classifySyncFailureReason,
  compareLocalServerMatchDeliveries,
  inspectLocalMatchDeliveries,
  runMatchDeliveryBackfillRecovery,
  syncOneLocalOnlyDelivery,
  type LocalDeliveryDiagnosticReport,
  type LocalOnlyDeliveryDetail,
  type LocalServerCompareReport,
} from "@/lib/local-db/read-only-match-delivery-diagnostic";

const DEFAULT_SLUG = "b0cdc08b2e";
const DEFAULT_MATCH_ID = "01e6c7aa-0f1f-4602-bd6a-fe83da1ce384";

function Row({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="flex justify-between gap-4 border-b border-[var(--rw-border)] py-2 text-sm">
      <span className="text-[var(--rw-muted)]">{label}</span>
      <span className="font-mono text-right break-all">{value}</span>
    </div>
  );
}

function InningsCounts({
  title,
  rows,
  total,
}: {
  title: string;
  rows: { label: string; count: number }[];
  total: number;
}) {
  return (
    <section className="mt-6">
      <h2 className="text-base font-semibold">{title}</h2>
      <ul className="mt-2 space-y-1 text-sm">
        {rows.map((r) => (
          <li key={r.label}>
            {r.label}: {r.count}
          </li>
        ))}
        <li className="font-semibold">Total: {total}</li>
      </ul>
    </section>
  );
}

function LocalOnlyCard({ d }: { d: LocalOnlyDeliveryDetail }) {
  const reason = classifySyncFailureReason(d.syncQueue?.last_error ?? null);
  return (
    <li className="rounded border border-[var(--rw-border)] p-3 text-xs font-mono">
      <p>
        seq={d.sequence_in_innings} ce={d.client_event_id}
      </p>
      <p>
        {d.striker_name} vs {d.bowler_name} | br={d.batter_runs} tot=
        {d.total_runs} | {d.extra_type} ex={d.extras_runs} | legal=
        {String(d.is_legal_delivery)} | wkt=
        {d.is_wicket ? d.wicket_type : "-"}
      </p>
      <p className="mt-1 text-[var(--rw-muted)]">
        queue: {d.syncQueue?.status ?? "missing"} attempts=
        {d.syncQueue?.attempts ?? "—"} | failure class: {reason}
      </p>
      {d.syncQueue?.last_error ? (
        <p className="mt-1 text-red-700">{d.syncQueue.last_error}</p>
      ) : null}
    </li>
  );
}

export default function LocalDeliveryStoreDiagnosticPage() {
  const [slug, setSlug] = useState(DEFAULT_SLUG);
  const [matchIdOverride, setMatchIdOverride] = useState(DEFAULT_MATCH_ID);
  const [report, setReport] = useState<LocalDeliveryDiagnosticReport | null>(
    null,
  );
  const [compare, setCompare] = useState<LocalServerCompareReport | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [actionMessage, setActionMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionBusy, setActionBusy] = useState(false);

  const runInspect = useCallback(async () => {
    setLoading(true);
    setError(null);
    setActionMessage(null);
    try {
      const result = await inspectLocalMatchDeliveries(slug.trim(), {
        matchIdOverride: matchIdOverride.trim() || undefined,
      });
      setReport(result);
      try {
        const cmp = await compareLocalServerMatchDeliveries(slug.trim(), {
          matchIdOverride: matchIdOverride.trim() || undefined,
        });
        setCompare(cmp);
      } catch (cmpErr) {
        setCompare(null);
        setError(
          cmpErr instanceof Error
            ? cmpErr.message
            : "Local/server compare failed",
        );
      }
    } catch (err) {
      setReport(null);
      setCompare(null);
      setError(err instanceof Error ? err.message : "Diagnostic failed");
    } finally {
      setLoading(false);
    }
  }, [slug, matchIdOverride]);

  useEffect(() => {
    void runInspect();
  }, [runInspect]);

  const inn2Compare = compare?.byInnings.find((i) => i.inningsNumber === 2);

  const onSyncOne = async () => {
    setActionBusy(true);
    setActionMessage(null);
    try {
      const result = await syncOneLocalOnlyDelivery(slug.trim(), 2);
      if (!result.ok) {
        setActionMessage(result.reason);
      } else {
        setActionMessage(
          `Persisted seq ${result.sequence_in_innings} (${result.client_event_id}) — verified on server.`,
        );
        await runInspect();
      }
    } catch (e) {
      setActionMessage(e instanceof Error ? e.message : "Sync one failed");
    } finally {
      setActionBusy(false);
    }
  };

  const onBackfillAll = async () => {
    const matchId =
      compare?.matchId ??
      (matchIdOverride.trim() || report?.matchId || "");
    if (!matchId) {
      setActionMessage("Match ID required for backfill");
      return;
    }
    setActionBusy(true);
    setActionMessage(null);
    try {
      const result = await runMatchDeliveryBackfillRecovery(matchId);
      setActionMessage(
        result.ok
          ? "Backfill idle — all recoverable queue items synced."
          : `${result.pending} item(s) still pending/failed after backfill.`,
      );
      await runInspect();
    } catch (e) {
      setActionMessage(e instanceof Error ? e.message : "Backfill failed");
    } finally {
      setActionBusy(false);
    }
  };

  return (
    <main className="rw-app-bg mx-auto min-h-full max-w-lg px-4 py-8 text-[var(--rw-text)]">
      <h1 className="text-xl font-semibold">Local delivery store (read-only)</h1>
      <p className="mt-2 text-sm text-[var(--rw-muted)]">
        IndexedDB inspection and client_event_id compare vs Supabase. Recovery
        buttons use the existing delivery API (active scorer session required).
      </p>

      <div className="mt-6 space-y-3">
        <label className="block text-sm">
          Share slug
          <input
            className="rw-focus-ring mt-1 w-full rounded border border-[var(--rw-border)] bg-[var(--rw-surface)] px-3 py-2 font-mono text-sm"
            value={slug}
            onChange={(e) => setSlug(e.target.value)}
          />
        </label>
        <label className="block text-sm">
          Match ID override (optional, local filter only)
          <input
            className="rw-focus-ring mt-1 w-full rounded border border-[var(--rw-border)] bg-[var(--rw-surface)] px-3 py-2 font-mono text-sm"
            value={matchIdOverride}
            onChange={(e) => setMatchIdOverride(e.target.value)}
            placeholder="Only if slug → match mapping missing locally"
          />
        </label>
        <button
          type="button"
          className="rw-focus-ring rw-btn-primary text-sm"
          onClick={() => void runInspect()}
          disabled={loading || actionBusy}
        >
          {loading ? "Reading…" : "Re-run scan + compare"}
        </button>
      </div>

      {error ? (
        <p className="mt-6 text-sm text-red-600" role="alert">
          {error}
        </p>
      ) : null}

      {actionMessage ? (
        <p className="mt-4 text-sm text-[var(--rw-primary)]">{actionMessage}</p>
      ) : null}

      {compare ? (
        <div className="mt-8 rounded-lg border border-[var(--rw-border)] bg-[var(--rw-surface)] p-4">
          <h2 className="font-semibold">Local vs server (client_event_id)</h2>
          {compare.serverFetchError ? (
            <p className="mt-2 text-sm text-red-600">
              Server fetch: {compare.serverFetchError}
            </p>
          ) : null}
          {compare.byInnings.map((inn) => (
            <section key={inn.inningsId} className="mt-4 text-sm">
              <h3 className="font-medium">
                Innings {inn.inningsNumber ?? "?"} ({inn.inningsId.slice(0, 8)}…)
              </h3>
              <Row label="Local count" value={inn.localCount} />
              <Row label="Server count" value={inn.serverCount} />
              <Row
                label="Local-only count"
                value={inn.localOnlyClientEventIds.length}
              />
              <Row
                label="Server-only count"
                value={inn.serverOnlyClientEventIds.length}
              />
              {inn.inningsNumber === 2 && inn.localOnlyDetails.length > 0 ? (
                <ul className="mt-3 space-y-2">
                  {inn.localOnlyDetails.map((d) => (
                    <LocalOnlyCard key={d.client_event_id} d={d} />
                  ))}
                </ul>
              ) : null}
            </section>
          ))}

          {inn2Compare && inn2Compare.localOnlyClientEventIds.length > 0 ? (
            <div className="mt-6 flex flex-col gap-2">
              <button
                type="button"
                className="rw-focus-ring rw-btn-primary text-sm"
                disabled={actionBusy}
                onClick={() => void onSyncOne()}
              >
                Sync one local-only (innings 2, lowest seq)
              </button>
              <button
                type="button"
                className="rw-focus-ring rounded border border-[var(--rw-border)] px-3 py-2 text-sm"
                disabled={actionBusy}
                onClick={() => void onBackfillAll()}
              >
                Run full backfill (requeue failed + flush)
              </button>
              <p className="text-xs text-[var(--rw-muted)]">
                Enter scorer PIN on this device first (Match Centre → Score).
                Do not re-score; these replay existing queue payloads.
              </p>
            </div>
          ) : null}
        </div>
      ) : null}

      {report ? (
        <div className="mt-8 rounded-lg border border-[var(--rw-border)] bg-[var(--rw-surface)] p-4">
          <p className="font-semibold">MATCH: {report.shareSlug}</p>
          {!report.matchId ? (
            <p className="mt-2 text-sm text-amber-700">
              Could not resolve match ID from local bootstrap/matches stores.
              Enter match ID override if you know it, or open the scorer once for
              this match on this device so bootstrap cache exists.
            </p>
          ) : (
            <p className="mt-1 font-mono text-xs text-[var(--rw-muted)]">
              matchId ({report.matchIdSource}): {report.matchId}
            </p>
          )}

          <div className="mt-4">
            <Row label="Dexie database" value={report.databaseName} />
            <Row
              label="Object stores"
              value={report.objectStoreNames.join(", ")}
            />
            <Row label="Status" value={report.status} />
          </div>

          <InningsCounts
            title="Local deliveries"
            rows={report.deliveries.byInningsLabel.map((r) => ({
              label: r.label,
              count: r.count,
            }))}
            total={report.deliveries.total}
          />

          <InningsCounts
            title="Pending sync (queue status=pending)"
            rows={report.syncQueue.pendingByInningsLabel.map((r) => ({
              label: r.label,
              count: r.count,
            }))}
            total={report.syncQueue.pendingTotal}
          />

          <section className="mt-6 text-sm">
            <h2 className="text-base font-semibold">Sync queue (all statuses)</h2>
            <p>Total: {report.syncQueue.total}</p>
            <ul className="mt-1 list-inside list-disc text-[var(--rw-muted)]">
              {Object.entries(report.syncQueue.byStatus).map(([s, n]) => (
                <li key={s}>
                  {s}: {n}
                </li>
              ))}
            </ul>
          </section>
        </div>
      ) : null}
    </main>
  );
}
