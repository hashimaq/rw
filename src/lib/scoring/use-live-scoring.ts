"use client";

import { useRouter } from "next/navigation";
import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import type {
  ScoringBootstrap,
  SquadPlayerOption,
} from "@/lib/data/scoring-bootstrap";
import { deliveryInputToPayload, payloadToDeliveryInput } from "@/lib/mappers/delivery";
import {
  buildByeDelivery,
  buildDeadBallDelivery,
  buildInningsStateFromDeliveries,
  buildLegByeDelivery,
  buildNoBallDelivery,
  type NoBallRunKind,
  buildNormalRunDelivery,
  buildWideDelivery,
  buildCreaseCorrectionDelivery,
  buildWicketDelivery,
  lastBowlerKey,
  liveSummary,
  type ActiveParticipants,
  type DeliveryInput,
  type InningsScoreState,
} from "@/lib/scoring-engine";
import { getLocalDb } from "@/lib/local-db/schema";
import {
  createApiDeliveryPusher,
  flushSyncQueue,
  flushSyncQueueUntilIdle,
  recordDeliveryLocalFirst,
} from "@/lib/sync/delivery-sync";
import { createApiUndoPusher, undoDeliveryLocal } from "@/lib/sync/undo-delivery";
import type { WicketType } from "@/lib/database/types";
import {
  resolveWicketDismissed,
  validateWicketConfirm,
} from "@/lib/scoring/wicket-flow";

import type { ParticipantRef } from "@/lib/scoring/participant";
import {
  scoringUiSnapshotFromEngineState,
  wicketReplacementSlotFromEngineState,
  type ScoringPhase,
} from "@/lib/scoring/scoring-phase";

export type { ScoringPhase };
export type { ParticipantRef } from "@/lib/scoring/participant";
import {
  authoritativeCreaseRefs,
  deriveCreaseDisplay,
  syncCreaseRefsFromEngineState,
} from "@/lib/scoring/crease-sync";
import { opponentBatterNamesFromDeliveries } from "@/lib/scoring/opponent-batters";
import {
  createOpponentBowler,
  createOpponentParticipant,
  opponentParticipantsFromDeliveries,
} from "@/lib/scoring/opponent-participant";
import {
  opponentBowlerNamesFromDeliveries,
  opponentBowlersFromDeliveries,
} from "@/lib/scoring/opponent-bowlers";
import {
  buildInningsResultInputs,
  deriveMatchResult,
} from "@/lib/scoring/derive-match-result";
import { participantKey } from "@/lib/scoring-engine/utils";

import { validateConsecutiveOverBowler } from "@/lib/scoring/bowler-consecutive-overs";
import { mergeDeliveries } from "@/lib/scoring/merge-deliveries";
import { saveScoringBootstrapCache } from "@/lib/local-db/scoring-bootstrap-cache";
import {
  emptySecondInningsState,
  secondInningsInfoFromApi,
  secondInningsScoringSnapshot,
  serverDeliveriesForHydration,
  type StartSecondInningsApiInnings,
} from "@/lib/scoring/second-innings-transition";
import {
  activeParticipantsForNextDelivery,
} from "@/lib/scoring/participants-from-state";
import {
  commitInningsDeliveryUpdate,
  type InningsDeliveryBuilder,
} from "@/lib/scoring/commit-innings-delivery";
import { isCreaseCorrectionDelivery } from "@/lib/scoring/scoring-meta-delivery";
import { undoLastScorerEvents } from "@/lib/scoring/undo-scorer-events";
import { useInningsDeliveriesRealtime } from "@/lib/scoring/use-innings-deliveries-realtime";

function activeCreaseHooks(
  state: InningsScoreState,
  striker: ParticipantRef | null,
  nonStriker: ParticipantRef | null,
): { striker: ParticipantRef; nonStriker: ParticipantRef } | null {
  const c = authoritativeCreaseRefs(state, { striker, nonStriker });
  if (!c.striker || !c.nonStriker) return null;
  return { striker: c.striker, nonStriker: c.nonStriker };
}

function participantsFromRefs(
  striker: ParticipantRef,
  nonStriker: ParticipantRef,
  bowler: ParticipantRef,
): ActiveParticipants {
  return {
    strikerPlayerId: striker.playerId,
    strikerName: striker.name,
    nonStrikerPlayerId: nonStriker.playerId,
    nonStrikerName: nonStriker.name,
    bowlerPlayerId: bowler.playerId,
    bowlerName: bowler.name,
  };
}

export function useLiveScoring(
  bootstrap: ScoringBootstrap,
  isController: boolean,
) {
  const router = useRouter();
  const [inningsList, setInningsList] = useState(bootstrap.innings);
  const [inningsId, setInningsId] = useState(bootstrap.activeInningsId);

  const activeInnings = useMemo(
    () =>
      inningsList.find((i) => i.id === inningsId) ??
      inningsList[inningsList.length - 1],
    [inningsList, inningsId],
  );
  const [state, setState] = useState<InningsScoreState>(() =>
    buildInningsStateFromDeliveries(
      bootstrap.deliveries,
      activeInnings.oversLimit,
      activeInnings.target,
    ),
  );
  const [striker, setStriker] = useState<ParticipantRef | null>(null);
  const [nonStriker, setNonStriker] = useState<ParticipantRef | null>(null);
  const [bowler, setBowler] = useState<ParticipantRef | null>(null);
  const [phase, setPhase] = useState<ScoringPhase>("setup_openers");
  const [opponentBatters, setOpponentBatters] = useState<ParticipantRef[]>([]);
  const [syncPending, setSyncPending] = useState(0);
  const [syncError, setSyncError] = useState<string | null>(null);
  const [isOnline, setIsOnline] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);
  const [startSecondInningsPending, setStartSecondInningsPending] =
    useState(false);
  const [startSecondInningsError, setStartSecondInningsError] = useState<
    string | null
  >(null);
  const [matchGuestBatters, setMatchGuestBatters] = useState<SquadPlayerOption[]>(
    () =>
      bootstrap.redWingsSquad.filter(
        (p) => p.isGuest && p.squadStatus === "bench",
      ),
  );
  const [hydrated, setHydrated] = useState(false);
  const inningsStartedRef = useRef(false);
  const stateRef = useRef(state);
  useLayoutEffect(() => {
    const refLen = stateRef.current.deliveries.length;
    const stateLen = state.deliveries.length;
    if (stateLen > refLen) {
      stateRef.current = state;
    } else if (stateLen === refLen && state !== stateRef.current) {
      stateRef.current = state;
    }
  }, [state]);
  const [matchCompleted, setMatchCompleted] = useState(false);
  const [resultSummary, setResultSummary] = useState<string | null>(
    bootstrap.resultSummary,
  );

  const applyLocalMatchResult = useCallback(
    (liveState: InningsScoreState, inningsIdToComplete: string) => {
      const inputs = buildInningsResultInputs(inningsList, {
        activeInningsId: inningsIdToComplete,
        liveTotalRuns: liveState.totalRuns,
        liveWickets: liveState.wickets,
        liveInningsComplete: true,
      });
      const derived = deriveMatchResult(inputs, bootstrap.opponentName);
      if (derived) setResultSummary(derived.resultSummary);
    },
    [inningsList, bootstrap.opponentName],
  );

  const postCompleteInnings = useCallback(
    async (
      inningsIdToComplete: string,
      totalRuns: number,
      wickets: number,
      inningsNumber: number,
    ) => {
      const res = await fetch("/api/scoring/complete-innings", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          innings_id: inningsIdToComplete,
          total_runs: totalRuns,
          wickets,
        }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) {
        if (body.code === "deliveries_not_synced") {
          setSyncError(
            typeof body.error === "string"
              ? body.error
              : "Deliveries must sync before completing innings.",
          );
        }
        return;
      }

      setInningsList((prev) =>
        prev.map((i) =>
          i.id === inningsIdToComplete
            ? {
                ...i,
                inningsStatus: "completed" as const,
                totalRuns,
                wickets,
              }
            : i,
        ),
      );

      if (body.match_completed) {
        setMatchCompleted(true);
        setPhase("match_complete");
        if (typeof body.result_summary === "string") {
          setResultSummary(body.result_summary);
        }
        router.refresh();
      } else if (inningsNumber >= 2) {
        setMatchCompleted(true);
        setPhase("match_complete");
        router.refresh();
      } else {
        setPhase("innings_saved");
      }
    },
    [router],
  );

  const battingIsRedWings = activeInnings.battingTeam === "red_wings";
  const bowlingIsRedWings = activeInnings.bowlingTeam === "red_wings";

  const rwOfficialBatters = useMemo(
    () =>
      bootstrap.redWingsSquad.filter(
        (p) => p.squadStatus === "playing_xi" && !p.isGuest,
      ),
    [bootstrap.redWingsSquad],
  );

  const rwGuestBatters = useMemo(() => {
    const map = new Map<string, SquadPlayerOption>();
    for (const p of bootstrap.redWingsSquad) {
      if (p.isGuest) map.set(p.id, p);
    }
    for (const p of matchGuestBatters) {
      map.set(p.id, p);
    }
    return [...map.values()];
  }, [bootstrap.redWingsSquad, matchGuestBatters]);

  const guestPlayerIds = useMemo(
    () => new Set(rwGuestBatters.map((p) => p.id)),
    [rwGuestBatters],
  );

  const battingXi = useMemo(() => {
    if (battingIsRedWings) {
      const map = new Map<string, SquadPlayerOption>();
      for (const p of bootstrap.redWingsSquad) {
        if (p.squadStatus === "playing_xi") map.set(p.id, p);
      }
      for (const p of rwGuestBatters) {
        if (!map.has(p.id)) map.set(p.id, p);
      }
      return [...map.values()];
    }
    return opponentBatters;
  }, [battingIsRedWings, bootstrap.redWingsSquad, rwGuestBatters, opponentBatters]);

  const bowlingXi = useMemo(() => {
    if (!bowlingIsRedWings) return [];
    return bootstrap.redWingsSquad.filter((p) => p.squadStatus === "playing_xi");
  }, [bowlingIsRedWings, bootstrap.redWingsSquad]);

  const opponentBowlerSuggestions = useMemo(
    () => opponentBowlerNamesFromDeliveries(state.deliveries),
    [state.deliveries],
  );

  const opponentBowlerOptions = useMemo(
    () => opponentBowlersFromDeliveries(state.deliveries),
    [state.deliveries],
  );

  const opponentBatterSuggestions = useMemo(
    () => opponentBatterNamesFromDeliveries(state.deliveries, state),
    [state],
  );

  const phaseContext = useMemo(
    () => ({
      inningsNumber: activeInnings.inningsNumber,
      inningsStatus: activeInnings.inningsStatus,
    }),
    [activeInnings.inningsNumber, activeInnings.inningsStatus],
  );

  const wicketReplacementSlot = useMemo(
    () =>
      phase === "need_batter"
        ? wicketReplacementSlotFromEngineState(state)
        : null,
    [state, phase],
  );

  const applyUiFromEngine = useCallback(
    (engineState: InningsScoreState) => {
      const snap = scoringUiSnapshotFromEngineState(engineState, phaseContext);
      setStriker(snap.striker);
      setNonStriker(snap.nonStriker);
      setBowler(snap.bowler);
      if (snap.phase === "match_complete") setMatchCompleted(true);
      setPhase(snap.phase);
    },
    [phaseContext],
  );

  const handleRemoteInningsRebuild = useCallback(
    (next: InningsScoreState) => {
      setState(next);
      applyUiFromEngine(next);
    },
    [applyUiFromEngine],
  );

  useInningsDeliveriesRealtime({
    matchId: bootstrap.matchId,
    inningsId,
    enabled: hydrated,
    hydrated,
    oversLimit: activeInnings.oversLimit,
    target: activeInnings.target,
    stateRef,
    onRebuilt: handleRemoteInningsRebuild,
  });

  const creaseDisplay = useMemo(
    () =>
      deriveCreaseDisplay(
        state,
        state.strikerKey,
        wicketReplacementSlot,
        phase === "need_batter",
      ),
    [state, wicketReplacementSlot, phase],
  );

  const summary = useMemo(() => liveSummary(state), [state]);

  const refreshSyncStats = useCallback(async () => {
    try {
      const db = getLocalDb();
      const pending = await db.syncQueue
        .where("status")
        .equals("pending")
        .count();
      setSyncPending(pending);
    } catch {
      /* ignore */
    }
  }, []);

  const runFlush = useCallback(async () => {
    if (!isController || !navigator.onLine) return;
    setIsSyncing(true);
    try {
      await flushSyncQueue(await createApiDeliveryPusher(), {
        matchId: bootstrap.matchId,
      });
      setSyncError(null);
    } catch (err) {
      setSyncError(err instanceof Error ? err.message : "Sync failed");
    } finally {
      setIsSyncing(false);
    }
    await refreshSyncStats();
  }, [bootstrap.matchId, isController, refreshSyncStats]);

  const completeInningsAfterSync = useCallback(
    async (
      inningsIdToComplete: string,
      totalRuns: number,
      wickets: number,
      inningsNumber: number,
    ) => {
      if (!isController) return;
      setIsSyncing(true);
      try {
        const flush = await flushSyncQueueUntilIdle(
          await createApiDeliveryPusher(),
          { matchId: bootstrap.matchId },
        );
        if (!flush.ok) {
          setSyncError(
            `${flush.pending} delivery update(s) still need to sync. Stay online and try again.`,
          );
          return;
        }
        await postCompleteInnings(
          inningsIdToComplete,
          totalRuns,
          wickets,
          inningsNumber,
        );
      } finally {
        setIsSyncing(false);
        await refreshSyncStats();
      }
    },
    [bootstrap.matchId, isController, postCompleteInnings, refreshSyncStats],
  );

  useEffect(() => {
    const syncOnline = () => setIsOnline(navigator.onLine);
    window.addEventListener("online", syncOnline);
    window.addEventListener("offline", syncOnline);
    syncOnline();
    return () => {
      window.removeEventListener("online", syncOnline);
      window.removeEventListener("offline", syncOnline);
    };
  }, []);

  useEffect(() => {
    void saveScoringBootstrapCache(bootstrap).catch(() => {
      /* ignore cache write errors */
    });
  }, [bootstrap]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const db = getLocalDb();
        const localRows = await db.deliveries
          .where("match_id")
          .equals(bootstrap.matchId)
          .filter((r) => r.innings_id === inningsId)
          .toArray();
        const localInputs = localRows.map((r) => payloadToDeliveryInput(r));
        const serverDeliveries = serverDeliveriesForHydration(
          bootstrap,
          inningsId,
        );
        const merged = mergeDeliveries(serverDeliveries, localInputs);
        const rebuilt = buildInningsStateFromDeliveries(
          merged,
          activeInnings.oversLimit,
          activeInnings.target,
        );
        if (cancelled) return;
        setState(rebuilt);
        stateRef.current = rebuilt;

        if (activeInnings.battingTeam === "opponent") {
          const names = opponentBatterNamesFromDeliveries(
            rebuilt.deliveries,
            rebuilt,
          );
          setOpponentBatters(opponentParticipantsFromDeliveries(rebuilt.deliveries));
        }

        if (rebuilt.deliveries.length > 0) {
          applyUiFromEngine(rebuilt);
          inningsStartedRef.current = true;
        } else {
          setPhase("setup_openers");
        }
      } finally {
        if (!cancelled) setHydrated(true);
      }
      await refreshSyncStats();
    })();
    return () => {
      cancelled = true;
    };
  }, [
    bootstrap.deliveries,
    bootstrap.matchId,
    inningsId,
    activeInnings.oversLimit,
    activeInnings.target,
    activeInnings.inningsNumber,
    activeInnings.inningsStatus,
    applyUiFromEngine,
    refreshSyncStats,
  ]);

  useEffect(() => {
    if (!isController || bootstrap.status === "completed") return;
    void runFlush();
    const id = window.setInterval(() => void runFlush(), 4000);
    const onOnline = () => void runFlush();
    window.addEventListener("online", onOnline);
    return () => {
      window.clearInterval(id);
      window.removeEventListener("online", onOnline);
    };
  }, [isController, runFlush, bootstrap.status]);

  const persistDeliveryInBackground = useCallback(
    (delivery: DeliveryInput) => {
      void (async () => {
        try {
          const payload = deliveryInputToPayload(inningsId, delivery);
          await recordDeliveryLocalFirst(bootstrap.matchId, payload);
        } catch {
          /* local queue / retry */
        }
        void refreshSyncStats();
        void runFlush();
        if (
          !inningsStartedRef.current &&
          !isCreaseCorrectionDelivery(delivery)
        ) {
          inningsStartedRef.current = true;
          void fetch("/api/scoring/begin-innings", {
            method: "POST",
            credentials: "include",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ innings_id: inningsId }),
          });
        }
      })();
    },
    [inningsId, bootstrap.matchId, refreshSyncStats, runFlush],
  );

  /** Meta / crease / bowler selection — sync engine update, background persist. */
  const commitParticipantsMeta = useCallback(
    (buildDelivery: InningsDeliveryBuilder): boolean => {
      if (!isController) return false;

      const clientEventId = crypto.randomUUID();
      const base = stateRef.current;
      const result = commitInningsDeliveryUpdate(
        base,
        base,
        clientEventId,
        buildDelivery,
        (b, delivery) =>
          !validateConsecutiveOverBowler(
            b,
            delivery.bowlerPlayerId,
            delivery.bowlerName,
          ),
      );

      if (!result.delivery || result.skippedDuplicate) return false;

      stateRef.current = result.next;
      setState(result.next);

      const snap = scoringUiSnapshotFromEngineState(result.next, phaseContext);
      setStriker(snap.striker);
      setNonStriker(snap.nonStriker);
      setBowler(snap.bowler);
      setPhase(snap.phase);

      persistDeliveryInBackground(result.delivery);
      return true;
    },
    [isController, phaseContext, persistDeliveryInBackground],
  );

  /** Apply delivery to local engine state immediately; persistence runs in background. */
  const commitDelivery = useCallback(
    (buildDelivery: InningsDeliveryBuilder): boolean => {
      if (!isController || !bowler) return false;

      const clientEventId = crypto.randomUUID();
      const base = stateRef.current;
      const result = commitInningsDeliveryUpdate(
        base,
        base,
        clientEventId,
        buildDelivery,
        (b, delivery) =>
          !validateConsecutiveOverBowler(
            b,
            delivery.bowlerPlayerId,
            delivery.bowlerName,
          ),
      );

      stateRef.current = result.next;
      setState(result.next);

      if (!result.delivery) return false;

      if (!result.skippedDuplicate) {
        const snap = scoringUiSnapshotFromEngineState(result.next, phaseContext);
        setStriker(snap.striker);
        setNonStriker(snap.nonStriker);
        setBowler(snap.bowler);
        if (snap.phase === "match_complete") {
          setMatchCompleted(true);
          if (activeInnings.inningsNumber >= 2) {
            applyLocalMatchResult(result.next, inningsId);
          }
          void completeInningsAfterSync(
            inningsId,
            result.next.totalRuns,
            result.next.wickets,
            activeInnings.inningsNumber,
          );
        }
        setPhase(snap.phase);
      }

      persistDeliveryInBackground(result.delivery);
      return true;
    },
    [
      isController,
      bowler,
      inningsId,
      activeInnings.inningsNumber,
      phaseContext,
      persistDeliveryInBackground,
      completeInningsAfterSync,
      applyLocalMatchResult,
    ],
  );

  const recordRun = useCallback(
    (runs: number) => {
      if (phase !== "scoring" || !bowler) return;
      const crease = activeCreaseHooks(stateRef.current, striker, nonStriker);
      if (!crease) return;
      commitDelivery((base, clientEventId) => {
        const P = activeParticipantsForNextDelivery(base, bowler, crease);
        if (!P) return null;
        return buildNormalRunDelivery(base, P, clientEventId, runs);
      });
    },
    [phase, striker, nonStriker, bowler, commitDelivery],
  );

  const recordWide = useCallback(
    (additional = 0) => {
      if (phase !== "scoring" || !bowler) return;
      const crease = activeCreaseHooks(stateRef.current, striker, nonStriker);
      if (!crease) return;
      commitDelivery((base, clientEventId) => {
        const P = activeParticipantsForNextDelivery(base, bowler, crease);
        if (!P) return null;
        return buildWideDelivery(base, P, clientEventId, additional);
      });
    },
    [phase, striker, nonStriker, bowler, commitDelivery],
  );

  const recordNoBall = useCallback(
    (kind: NoBallRunKind, additionalRuns = 0) => {
      if (phase !== "scoring" || !bowler) return;
      const crease = activeCreaseHooks(stateRef.current, striker, nonStriker);
      if (!crease) return;
      commitDelivery((base, clientEventId) => {
        const P = activeParticipantsForNextDelivery(base, bowler, crease);
        if (!P) return null;
        return buildNoBallDelivery(base, P, clientEventId, {
          kind,
          additionalRuns,
        });
      });
    },
    [phase, striker, nonStriker, bowler, commitDelivery],
  );

  const recordBye = useCallback(
    (runs: number) => {
      if (phase !== "scoring" || !bowler) return;
      const crease = activeCreaseHooks(stateRef.current, striker, nonStriker);
      if (!crease) return;
      commitDelivery((base, clientEventId) => {
        const P = activeParticipantsForNextDelivery(base, bowler, crease);
        if (!P) return null;
        return buildByeDelivery(base, P, clientEventId, runs);
      });
    },
    [phase, striker, nonStriker, bowler, commitDelivery],
  );

  const recordLegBye = useCallback(
    (runs: number) => {
      if (phase !== "scoring" || !bowler) return;
      const crease = activeCreaseHooks(stateRef.current, striker, nonStriker);
      if (!crease) return;
      commitDelivery((base, clientEventId) => {
        const P = activeParticipantsForNextDelivery(base, bowler, crease);
        if (!P) return null;
        return buildLegByeDelivery(base, P, clientEventId, runs);
      });
    },
    [phase, striker, nonStriker, bowler, commitDelivery],
  );

  const recordDeadBall = useCallback(() => {
    if (phase !== "scoring" || !bowler) return;
    const crease = activeCreaseHooks(stateRef.current, striker, nonStriker);
    if (!crease) return;
    commitDelivery((base, clientEventId) => {
      const P = activeParticipantsForNextDelivery(base, bowler, crease);
      if (!P) return null;
      return buildDeadBallDelivery(base, P, clientEventId);
    });
  }, [phase, striker, nonStriker, bowler, commitDelivery]);

  const commitCreaseCorrection = useCallback(
    (strikerRef: ParticipantRef, nonStrikerRef: ParticipantRef) => {
      if (!bowler || !isController) return false;
      return commitDelivery((base, clientEventId) =>
        buildCreaseCorrectionDelivery(
          base,
          participantsFromRefs(strikerRef, nonStrikerRef, bowler),
          clientEventId,
        ),
      );
    },
    [bowler, isController, commitDelivery],
  );

  const recordWicket = useCallback(
    (options: {
      wicketType: WicketType;
      dismissed: ParticipantRef;
      fielder?: ParticipantRef | null;
      batterRuns?: number;
    }) => {
      if (!bowler) return;
      if (phase !== "scoring" && phase !== "need_batter") return;
      const crease = authoritativeCreaseRefs(stateRef.current, {
        striker,
        nonStriker,
      });
      if (!crease.striker || !crease.nonStriker) return;
      const dismissed = resolveWicketDismissed(
        options.wicketType,
        crease.striker,
        crease.nonStriker,
        options.dismissed,
      );
      if (!dismissed) return;
      const confirmPayload = { ...options, dismissed };
      const validation = validateWicketConfirm(confirmPayload);
      if (validation) return;
      commitDelivery((base, clientEventId) => {
        const liveCrease = authoritativeCreaseRefs(base, {
          striker,
          nonStriker,
        });
        if (!liveCrease.striker || !liveCrease.nonStriker) return null;
        return buildWicketDelivery(
          base,
          participantsFromRefs(liveCrease.striker, liveCrease.nonStriker, bowler),
          clientEventId,
          {
            wicketType: options.wicketType,
            dismissedPlayerId: dismissed.playerId,
            dismissedPlayerName: dismissed.name,
            fielderPlayerId: options.fielder?.playerId ?? null,
            fielderName: options.fielder?.name ?? null,
            batterRuns: options.batterRuns ?? 0,
          },
        );
      });
    },
    [bowler, phase, commitDelivery, striker, nonStriker],
  );

  const setManualStriker = useCallback(
    (picked: ParticipantRef): string | null => {
      if (!isController || !bowler) return null;
      if (phase !== "scoring") return null;
      const crease = authoritativeCreaseRefs(stateRef.current, {
        striker,
        nonStriker,
      });
      if (!crease.striker || !crease.nonStriker) return null;

      const pickedKey = participantKey(picked.playerId, picked.name);
      const strikerKey = participantKey(
        crease.striker.playerId,
        crease.striker.name,
      );
      const nonStrikerKey = participantKey(
        crease.nonStriker.playerId,
        crease.nonStriker.name,
      );
      if (pickedKey === strikerKey) return null;
      if (pickedKey !== nonStrikerKey) return null;

      const newStriker = picked;
      const newNonStriker = crease.striker;

      setStriker(newStriker);
      setNonStriker(newNonStriker);

      if (stateRef.current.deliveries.length === 0) {
        return `${newStriker.name} is now striker`;
      }

      commitCreaseCorrection(newStriker, newNonStriker);
      return `${newStriker.name} is now striker`;
    },
    [isController, bowler, phase, striker, nonStriker, commitCreaseCorrection],
  );

  const undo = useCallback(() => {
    const current = stateRef.current;
    if (!isController || current.deliveries.length === 0) return;
    const result = undoLastScorerEvents(current);
    if (!result) return;
    const { next, removed } = result;
    stateRef.current = next;
    setState(next);
    applyUiFromEngine(next);

    void (async () => {
      for (const delivery of removed) {
        await undoDeliveryLocal(delivery.clientEventId);
        try {
          const push = await createApiUndoPusher();
          await push(delivery.clientEventId);
        } catch {
          /* local undo still applied */
        }
      }
      void refreshSyncStats();
      void runFlush();
    })();
  }, [isController, applyUiFromEngine, refreshSyncStats, runFlush]);

  const canSelectManualStriker = useMemo(() => {
    if (!isController || phase !== "scoring") return false;
    const crease = authoritativeCreaseRefs(state, {
      striker,
      nonStriker,
    });
    return Boolean(crease.striker && crease.nonStriker);
  }, [isController, phase, state, striker, nonStriker]);

  const confirmOpeners = useCallback(
    (s: ParticipantRef, ns: ParticipantRef, b: ParticipantRef) => {
      setStriker(s);
      setNonStriker(ns);
      setBowler(b);
      setPhase("scoring");
      commitParticipantsMeta((base, clientEventId) =>
        buildCreaseCorrectionDelivery(
          base,
          participantsFromRefs(s, ns, b),
          clientEventId,
        ),
      );
    },
    [commitParticipantsMeta],
  );

  const confirmBowler = useCallback(
    (b: ParticipantRef) => {
      const err = validateConsecutiveOverBowler(
        stateRef.current,
        b.playerId,
        b.name,
      );
      if (err) return;

      setBowler(b);
      setPhase("scoring");

      const crease = authoritativeCreaseRefs(stateRef.current, {
        striker,
        nonStriker,
      });
      const sRef = crease.striker;
      const nsRef = crease.nonStriker;
      if (!sRef || !nsRef) return;

      commitParticipantsMeta((base, clientEventId) =>
        buildCreaseCorrectionDelivery(
          base,
          participantsFromRefs(sRef, nsRef, b),
          clientEventId,
        ),
      );
    },
    [commitParticipantsMeta, striker, nonStriker],
  );

  const confirmOpponentBowler = useCallback(
    (name: string) => {
      const trimmed = name.trim();
      if (!trimmed) return;
      const err = validateConsecutiveOverBowler(stateRef.current, null, trimmed);
      if (err) return;
      const bowlerRef = createOpponentBowler(trimmed);

      setBowler(bowlerRef);
      setPhase("scoring");

      const crease = authoritativeCreaseRefs(stateRef.current, {
        striker,
        nonStriker,
      });
      const sRef = crease.striker;
      const nsRef = crease.nonStriker;
      if (!sRef || !nsRef) return;

      commitParticipantsMeta((base, clientEventId) =>
        buildCreaseCorrectionDelivery(
          base,
          participantsFromRefs(sRef, nsRef, bowlerRef),
          clientEventId,
        ),
      );
    },
    [commitParticipantsMeta, striker, nonStriker],
  );

  const confirmOpponentBatter = useCallback(
    (name: string) => {
      const trimmed = name.trim();
      if (!trimmed) return;
      setOpponentBatters((prev) => {
        if (prev.some((p) => p.name.toLowerCase() === trimmed.toLowerCase())) {
          return prev;
        }
        return [...prev, createOpponentParticipant(trimmed)];
      });
      const batter = createOpponentParticipant(trimmed);
      const slot = wicketReplacementSlotFromEngineState(stateRef.current);
      const engine = syncCreaseRefsFromEngineState(stateRef.current);
      if (slot === "striker") {
        const ns = engine.nonStriker ?? nonStriker;
        if (!ns) return;
        setStriker(batter);
        setNonStriker(ns);
        setPhase("scoring");
        commitCreaseCorrection(batter, ns);
      } else if (slot === "non_striker") {
        const s = engine.striker ?? striker;
        if (!s) return;
        setStriker(s);
        setNonStriker(batter);
        setPhase("scoring");
        commitCreaseCorrection(s, batter);
      }
    },
    [commitCreaseCorrection, nonStriker, striker],
  );

  const confirmNewBatter = useCallback(
    (batter: ParticipantRef) => {
      const slot = wicketReplacementSlotFromEngineState(stateRef.current);
      const engine = syncCreaseRefsFromEngineState(stateRef.current);
      if (slot === "striker") {
        const ns = engine.nonStriker ?? nonStriker;
        if (!ns) return;
        setStriker(batter);
        setNonStriker(ns);
        setPhase("scoring");
        commitCreaseCorrection(batter, ns);
      } else if (slot === "non_striker") {
        const s = engine.striker ?? striker;
        if (!s) return;
        setStriker(s);
        setNonStriker(batter);
        setPhase("scoring");
        commitCreaseCorrection(s, batter);
      }
    },
    [commitCreaseCorrection, nonStriker, striker],
  );

  const createMatchGuestPlayer = useCallback(async (fullName: string) => {
    const trimmed = fullName.trim().replace(/\s+/g, " ");
    if (!trimmed) return null;
    const res = await fetch("/api/scoring/match-guest-player", {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ full_name: trimmed }),
    });
    const body = await res.json().catch(() => ({}));
    if (!res.ok) {
      throw new Error(body.error ?? "Could not add guest player");
    }
    const option: SquadPlayerOption = {
      id: body.id as string,
      name: body.name as string,
      isCaptain: false,
      isWicketkeeper: false,
      squadStatus: "bench",
      isGuest: true,
    };
    setMatchGuestBatters((prev) => {
      if (prev.some((p) => p.id === option.id)) return prev;
      return [...prev, option];
    });
    return option;
  }, []);

  const addOpponentBatter = useCallback((name: string) => {
    const trimmed = name.trim();
    if (!trimmed) return;
    setOpponentBatters((prev) => {
      if (prev.some((p) => p.name.toLowerCase() === trimmed.toLowerCase())) {
        return prev;
      }
      return [...prev, createOpponentParticipant(trimmed)];
    });
  }, []);

  const saveInnings = useCallback(async () => {
    const s = stateRef.current;
    await completeInningsAfterSync(
      inningsId,
      s.totalRuns,
      s.wickets,
      activeInnings.inningsNumber,
    );
  }, [
    completeInningsAfterSync,
    inningsId,
    activeInnings.inningsNumber,
  ]);

  const applySecondInningsActivated = useCallback(
    (inn: StartSecondInningsApiInnings, previousActive: typeof activeInnings) => {
      const nextInnings = secondInningsInfoFromApi(inn, previousActive);
      const empty = emptySecondInningsState(inn.overs_limit, inn.target);
      const snap = secondInningsScoringSnapshot(empty, 2, nextInnings.inningsStatus);

      setInningsList((prev) => {
        const nextList = prev.some((i) => i.id === nextInnings.id)
          ? prev.map((i) => (i.id === nextInnings.id ? nextInnings : i))
          : [...prev, nextInnings];
        void saveScoringBootstrapCache({
          ...bootstrap,
          activeInningsId: nextInnings.id,
          deliveries: [],
          innings: nextList,
        }).catch(() => {
          /* cache optional */
        });
        return nextList;
      });
      setInningsId(nextInnings.id);
      stateRef.current = empty;
      setState(empty);
      setStriker(snap.striker);
      setNonStriker(snap.nonStriker);
      setBowler(snap.bowler);
      setPhase(snap.phase);
      setOpponentBatters([]);
      setStartSecondInningsError(null);
      inningsStartedRef.current = false;
      setMatchCompleted(false);
    },
    [bootstrap],
  );

  const startSecondInnings = useCallback(async () => {
    if (startSecondInningsPending) return;
    if (activeInnings.inningsNumber >= 2) return;
    setStartSecondInningsPending(true);
    setStartSecondInningsError(null);
    const previousActive = activeInnings;
    try {
      const res = await fetch("/api/scoring/start-innings", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ match_id: bootstrap.matchId }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(body.error ?? "Could not start innings 2");
      }
      applySecondInningsActivated(
        body.innings as StartSecondInningsApiInnings,
        previousActive,
      );
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Could not start innings 2";
      setStartSecondInningsError(message);
      throw err;
    } finally {
      setStartSecondInningsPending(false);
    }
  }, [
    startSecondInningsPending,
    bootstrap.matchId,
    activeInnings,
    applySecondInningsActivated,
  ]);

  const forbiddenBowlerKeys = useMemo(() => {
    const last = lastBowlerKey(state);
    return last ? new Set([last]) : new Set<string>();
  }, [state]);

  const forbiddenOpponentBowlerName = useMemo(() => {
    const lastKey = lastBowlerKey(state);
    if (!lastKey) return null;
    return state.bowlers[lastKey]?.name ?? null;
  }, [state]);

  return {
    hydrated,
    phase,
    state,
    summary,
    striker,
    nonStriker,
    bowler,
    battingXi,
    rwOfficialBatters,
    rwGuestBatters,
    guestPlayerIds,
    createMatchGuestPlayer,
    bowlingXi,
    battingIsRedWings,
    bowlingIsRedWings,
    opponentBatters,
    addOpponentBatter,
    activeInnings,
    inningsList,
    syncPending,
    syncError,
    isOnline,
    isSyncing,
    forbiddenBowlerKeys,
    forbiddenOpponentBowlerName,
    opponentBowlerSuggestions,
    opponentBowlerOptions,
    opponentBatterSuggestions,
    creaseDisplay,
    wicketReplacementSlot,
    confirmOpeners,
    confirmBowler,
    confirmOpponentBowler,
    confirmOpponentBatter,
    confirmNewBatter,
    recordRun,
    recordWide,
    recordNoBall,
    recordBye,
    recordLegBye,
    recordDeadBall,
    recordWicket,
    undo,
    saveInnings,
    startSecondInnings,
    startSecondInningsPending,
    startSecondInningsError,
    matchCompleted,
    resultSummary,
    canSelectManualStriker,
    setManualStriker,
  };
}
