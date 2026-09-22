"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type {
  ScoringBootstrap,
  SquadPlayerOption,
} from "@/lib/data/scoring-bootstrap";
import { deliveryInputToPayload, payloadToDeliveryInput } from "@/lib/mappers/delivery";
import {
  applyDeliveryToState,
  buildByeDelivery,
  buildDeadBallDelivery,
  buildInningsStateFromDeliveries,
  buildLegByeDelivery,
  buildNoBallDelivery,
  buildNormalRunDelivery,
  buildWideDelivery,
  buildWicketDelivery,
  inningsIsComplete,
  lastBowlerKey,
  liveSummary,
  needsBowlerChange,
  undoLastDelivery,
  type ActiveParticipants,
  type DeliveryInput,
  type InningsScoreState,
} from "@/lib/scoring-engine";
import { getLocalDb } from "@/lib/local-db/schema";
import {
  createApiDeliveryPusher,
  flushSyncQueue,
  recordDeliveryLocalFirst,
} from "@/lib/sync/delivery-sync";
import { createApiUndoPusher, undoDeliveryLocal } from "@/lib/sync/undo-delivery";
import type { WicketType } from "@/lib/database/types";
import {
  resolveWicketDismissed,
  validateWicketConfirm,
} from "@/lib/scoring/wicket-flow";

export type ScoringPhase =
  | "setup_openers"
  | "setup_bowler"
  | "need_bowler"
  | "need_batter"
  | "scoring"
  | "innings_complete"
  | "innings_saved"
  | "match_complete";

import type { ParticipantRef } from "@/lib/scoring/participant";
export type { ParticipantRef } from "@/lib/scoring/participant";
import {
  deriveCreaseDisplay,
  syncCreaseRefsFromEngineState,
  wicketReplacementSlotFromDelivery,
} from "@/lib/scoring/crease-sync";
import { opponentBatterNamesFromDeliveries } from "@/lib/scoring/opponent-batters";
import { opponentBowlerNamesFromDeliveries } from "@/lib/scoring/opponent-bowlers";
import { participantKey } from "@/lib/scoring-engine/utils";

import { mergeDeliveries } from "@/lib/scoring/merge-deliveries";
import { saveScoringBootstrapCache } from "@/lib/local-db/scoring-bootstrap-cache";

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

function activeBattersCount(state: InningsScoreState): number {
  const keys = new Set([state.strikerKey, state.nonStrikerKey].filter(Boolean));
  let count = 0;
  for (const key of keys) {
    const b = key ? state.batters[key] : null;
    if (b && !b.isOut) count += 1;
  }
  return count;
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
  const [wicketReplacementSlot, setWicketReplacementSlot] = useState<
    "striker" | "non_striker" | null
  >(null);
  const [syncPending, setSyncPending] = useState(0);
  const [syncError, setSyncError] = useState<string | null>(null);
  const [isOnline, setIsOnline] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);
  const [matchGuestBatters, setMatchGuestBatters] = useState<SquadPlayerOption[]>(
    () =>
      bootstrap.redWingsSquad.filter(
        (p) => p.isGuest && p.squadStatus === "bench",
      ),
  );
  const [hydrated, setHydrated] = useState(false);
  const inningsStartedRef = useRef(false);
  const stateRef = useRef(state);
  stateRef.current = state;
  const [matchCompleted, setMatchCompleted] = useState(false);
  const [resultSummary, setResultSummary] = useState<string | null>(
    bootstrap.resultSummary,
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
      if (!res.ok) return;

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

  const opponentBatterSuggestions = useMemo(
    () => opponentBatterNamesFromDeliveries(state.deliveries, state),
    [state],
  );

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
      await flushSyncQueue(await createApiDeliveryPusher());
      setSyncError(null);
    } catch (err) {
      setSyncError(err instanceof Error ? err.message : "Sync failed");
    } finally {
      setIsSyncing(false);
    }
    await refreshSyncStats();
  }, [isController, refreshSyncStats]);

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
        const merged = mergeDeliveries(bootstrap.deliveries, localInputs);
        const rebuilt = buildInningsStateFromDeliveries(
          merged,
          activeInnings.oversLimit,
          activeInnings.target,
        );
        if (cancelled) return;
        setState(rebuilt);

        if (activeInnings.battingTeam === "opponent") {
          const names = opponentBatterNamesFromDeliveries(
            rebuilt.deliveries,
            rebuilt,
          );
          setOpponentBatters(names.map((name) => ({ playerId: null, name })));
        }

        if (rebuilt.deliveries.length > 0) {
          const last = rebuilt.deliveries[rebuilt.deliveries.length - 1];
          setStriker({
            playerId: last.strikerPlayerId,
            name: last.strikerName,
          });
          setNonStriker({
            playerId: last.nonStrikerPlayerId,
            name: last.nonStrikerName,
          });
          setBowler({
            playerId: last.bowlerPlayerId,
            name: last.bowlerName,
          });
          if (inningsIsComplete(rebuilt)) {
            if (activeInnings.inningsNumber >= 2) {
              setMatchCompleted(true);
              setPhase("match_complete");
            } else if (activeInnings.inningsStatus === "completed") {
              setPhase("innings_saved");
            } else {
              setPhase("innings_complete");
            }
          } else if (needsBowlerChange(rebuilt)) {
            setPhase("need_bowler");
          } else if (activeBattersCount(rebuilt) < 2 && rebuilt.wickets < 10) {
            setPhase("need_batter");
          } else {
            setPhase("scoring");
          }
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
    refreshSyncStats,
  ]);

  useEffect(() => {
    if (!isController) return;
    void runFlush();
    const id = window.setInterval(() => void runFlush(), 4000);
    const onOnline = () => void runFlush();
    window.addEventListener("online", onOnline);
    return () => {
      window.clearInterval(id);
      window.removeEventListener("online", onOnline);
    };
  }, [isController, runFlush]);

  const commitDelivery = useCallback(
    async (delivery: DeliveryInput) => {
      if (!isController || !striker || !nonStriker || !bowler) return;

      setState((prev) => {
        const next = applyDeliveryToState(prev, delivery);
        const crease = syncCreaseRefsFromEngineState(next);
        if (
          delivery.isWicket &&
          activeBattersCount(next) < 2 &&
          next.wickets < 10
        ) {
          setWicketReplacementSlot(
            wicketReplacementSlotFromDelivery(
              next,
              delivery.dismissedPlayerId,
              delivery.dismissedPlayerName,
            ),
          );
          if (crease.striker) setStriker(crease.striker);
          if (crease.nonStriker) setNonStriker(crease.nonStriker);
          setPhase("need_batter");
        } else {
          setWicketReplacementSlot(null);
          if (crease.striker) setStriker(crease.striker);
          if (crease.nonStriker) setNonStriker(crease.nonStriker);
          if (inningsIsComplete(next)) {
            if (activeInnings.inningsNumber >= 2) {
              void postCompleteInnings(
                inningsId,
                next.totalRuns,
                next.wickets,
                activeInnings.inningsNumber,
              );
            } else {
              setPhase("innings_complete");
            }
          } else if (needsBowlerChange(next)) {
            setPhase("need_bowler");
          } else {
            setPhase("scoring");
          }
        }
        return next;
      });

      const payload = deliveryInputToPayload(inningsId, delivery);
      await recordDeliveryLocalFirst(bootstrap.matchId, payload);
      await refreshSyncStats();
      void runFlush();

      if (!inningsStartedRef.current) {
        inningsStartedRef.current = true;
        void fetch("/api/scoring/begin-innings", {
          method: "POST",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ innings_id: inningsId }),
        });
      }
    },
    [
      isController,
      striker,
      nonStriker,
      bowler,
      inningsId,
      bootstrap.matchId,
      activeInnings.inningsNumber,
      refreshSyncStats,
      runFlush,
      postCompleteInnings,
    ],
  );

  const recordRun = useCallback(
    async (runs: number) => {
      if (phase !== "scoring" || !striker || !nonStriker || !bowler) return;
      const id = crypto.randomUUID();
      const delivery = buildNormalRunDelivery(
        stateRef.current,
        participantsFromRefs(striker, nonStriker, bowler),
        id,
        runs,
      );
      await commitDelivery(delivery);
    },
    [phase, striker, nonStriker, bowler, commitDelivery],
  );

  const recordWide = useCallback(
    async (additional = 0) => {
      if (phase !== "scoring" || !striker || !nonStriker || !bowler) return;
      const id = crypto.randomUUID();
      const delivery = buildWideDelivery(
        stateRef.current,
        participantsFromRefs(striker, nonStriker, bowler),
        id,
        additional,
      );
      await commitDelivery(delivery);
    },
    [phase, striker, nonStriker, bowler, commitDelivery],
  );

  const recordNoBall = useCallback(
    async (batterRuns: number) => {
      if (phase !== "scoring" || !striker || !nonStriker || !bowler) return;
      const id = crypto.randomUUID();
      const delivery = buildNoBallDelivery(
        stateRef.current,
        participantsFromRefs(striker, nonStriker, bowler),
        id,
        batterRuns,
      );
      await commitDelivery(delivery);
    },
    [phase, striker, nonStriker, bowler, commitDelivery],
  );

  const recordBye = useCallback(
    async (runs: number) => {
      if (phase !== "scoring" || !striker || !nonStriker || !bowler) return;
      const id = crypto.randomUUID();
      const delivery = buildByeDelivery(
        stateRef.current,
        participantsFromRefs(striker, nonStriker, bowler),
        id,
        runs,
      );
      await commitDelivery(delivery);
    },
    [phase, striker, nonStriker, bowler, commitDelivery],
  );

  const recordLegBye = useCallback(
    async (runs: number) => {
      if (phase !== "scoring" || !striker || !nonStriker || !bowler) return;
      const id = crypto.randomUUID();
      const delivery = buildLegByeDelivery(
        stateRef.current,
        participantsFromRefs(striker, nonStriker, bowler),
        id,
        runs,
      );
      await commitDelivery(delivery);
    },
    [phase, striker, nonStriker, bowler, commitDelivery],
  );

  const recordDeadBall = useCallback(async () => {
    if (phase !== "scoring" || !striker || !nonStriker || !bowler) return;
    const id = crypto.randomUUID();
    const delivery = buildDeadBallDelivery(
      stateRef.current,
      participantsFromRefs(striker, nonStriker, bowler),
      id,
    );
    await commitDelivery(delivery);
  }, [phase, striker, nonStriker, bowler, commitDelivery]);

  const recordWicket = useCallback(
    async (options: {
      wicketType: WicketType;
      dismissed: ParticipantRef;
      fielder?: ParticipantRef | null;
      batterRuns?: number;
    }) => {
      if (!bowler) return;
      if (phase !== "scoring" && phase !== "need_batter") return;
      const crease = syncCreaseRefsFromEngineState(stateRef.current);
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
      const id = crypto.randomUUID();
      const delivery = buildWicketDelivery(
        stateRef.current,
        participantsFromRefs(crease.striker, crease.nonStriker, bowler),
        id,
        {
          wicketType: options.wicketType,
          dismissedPlayerId: dismissed.playerId,
          dismissedPlayerName: dismissed.name,
          fielderPlayerId: options.fielder?.playerId ?? null,
          fielderName: options.fielder?.name ?? null,
          batterRuns: options.batterRuns ?? 0,
        },
      );
      await commitDelivery(delivery);
    },
    [bowler, phase, commitDelivery],
  );

  const undo = useCallback(async () => {
    if (!isController || state.deliveries.length === 0) return;
    const last = state.deliveries[state.deliveries.length - 1];
    const next = undoLastDelivery(state);
    if (!next) return;
    setState(next);
    await undoDeliveryLocal(last.clientEventId);
    try {
      const push = await createApiUndoPusher();
      await push(last.clientEventId);
    } catch {
      /* local undo still applied; sync may retry */
    }
    await refreshSyncStats();
    void runFlush();

    const crease = syncCreaseRefsFromEngineState(next);
    if (crease.striker) setStriker(crease.striker);
    if (crease.nonStriker) setNonStriker(crease.nonStriker);
    const lastD = next.deliveries[next.deliveries.length - 1];
    if (lastD) {
      setBowler({ playerId: lastD.bowlerPlayerId, name: lastD.bowlerName });
    }
    setWicketReplacementSlot(null);
    if (inningsIsComplete(next)) {
      if (activeInnings.inningsNumber >= 2) {
        setMatchCompleted(true);
        setPhase("match_complete");
      } else {
        setPhase("innings_complete");
      }
    } else if (needsBowlerChange(next)) setPhase("need_bowler");
    else if (activeBattersCount(next) < 2 && next.wickets < 10) {
      setPhase("need_batter");
    } else setPhase("scoring");
  }, [isController, state, activeInnings.inningsNumber, refreshSyncStats, runFlush]);

  const canSwapInitialStrike = useMemo(
    () => state.deliveries.length === 0 && Boolean(striker && nonStriker),
    [state.deliveries.length, striker, nonStriker],
  );

  const swapInitialStrike = useCallback(() => {
    if (stateRef.current.deliveries.length > 0) return;
    if (!striker || !nonStriker) return;
    setStriker(nonStriker);
    setNonStriker(striker);
  }, [nonStriker, striker]);

  const confirmOpeners = useCallback(
    (s: ParticipantRef, ns: ParticipantRef, b: ParticipantRef) => {
      setStriker(s);
      setNonStriker(ns);
      setBowler(b);
      setPhase("scoring");
    },
    [],
  );

  const confirmBowler = useCallback((b: ParticipantRef) => {
    setBowler(b);
    setPhase("scoring");
  }, []);

  const confirmOpponentBowler = useCallback((name: string) => {
    const trimmed = name.trim();
    if (!trimmed) return;
    setBowler({ playerId: null, name: trimmed });
    setPhase("scoring");
  }, []);

  const confirmOpponentBatter = useCallback(
    (name: string) => {
      const trimmed = name.trim();
      if (!trimmed) return;
      setOpponentBatters((prev) => {
        if (prev.some((p) => p.name.toLowerCase() === trimmed.toLowerCase())) {
          return prev;
        }
        return [...prev, { playerId: null, name: trimmed }];
      });
      const batter: ParticipantRef = { playerId: null, name: trimmed };
      if (wicketReplacementSlot === "striker") setStriker(batter);
      else if (wicketReplacementSlot === "non_striker") setNonStriker(batter);
      else if (striker && nonStriker) {
        const sk = participantKey(striker.playerId, striker.name);
        if (state.batters[sk]?.isOut) setStriker(batter);
        else setNonStriker(batter);
      }
      setWicketReplacementSlot(null);
      setPhase("scoring");
    },
    [wicketReplacementSlot, striker, nonStriker, state.batters],
  );

  const confirmNewBatter = useCallback(
    (batter: ParticipantRef) => {
      if (wicketReplacementSlot === "striker") setStriker(batter);
      else if (wicketReplacementSlot === "non_striker") setNonStriker(batter);
      else if (striker && nonStriker) {
        const sk = participantKey(striker.playerId, striker.name);
        if (state.batters[sk]?.isOut) setStriker(batter);
        else setNonStriker(batter);
      }
      setWicketReplacementSlot(null);
      setPhase("scoring");
    },
    [wicketReplacementSlot, striker, nonStriker, state.batters],
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
      return [...prev, { playerId: null, name: trimmed }];
    });
  }, []);

  const saveInnings = useCallback(async () => {
    const s = stateRef.current;
    await postCompleteInnings(
      inningsId,
      s.totalRuns,
      s.wickets,
      activeInnings.inningsNumber,
    );
  }, [
    postCompleteInnings,
    inningsId,
    activeInnings.inningsNumber,
  ]);

  const startSecondInnings = useCallback(async () => {
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
    const inn = body.innings as {
      id: string;
      overs_limit: number;
      target: number | null;
    };
    setInningsList((prev) => [
      ...prev,
      {
        id: inn.id,
        inningsNumber: 2,
        battingTeam:
          activeInnings.battingTeam === "red_wings" ? "opponent" : "red_wings",
        bowlingTeam:
          activeInnings.bowlingTeam === "red_wings" ? "opponent" : "red_wings",
        inningsStatus: "not_started" as const,
        target: inn.target,
        oversLimit: inn.overs_limit,
        totalRuns: 0,
        wickets: 0,
      },
    ]);
    setInningsId(inn.id);
    setState(createEmptyFromInnings(inn.overs_limit, inn.target));
    setStriker(null);
    setNonStriker(null);
    setBowler(null);
    setPhase("setup_openers");
    inningsStartedRef.current = false;
  }, [bootstrap.matchId, activeInnings.battingTeam, activeInnings.bowlingTeam]);

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
    matchCompleted,
    resultSummary,
    canSwapInitialStrike,
    swapInitialStrike,
  };
}

function createEmptyFromInnings(oversLimit: number, target: number | null) {
  return buildInningsStateFromDeliveries([], oversLimit, target);
}
