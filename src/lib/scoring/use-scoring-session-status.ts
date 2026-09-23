"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import {
  SCORING_CONTROL_BROADCAST_EVENT,
  type ScoringControlBroadcastPayload,
  scoringControlChannelName,
} from "@/lib/scoring/control-realtime";
import {
  mergeSessionStatusForOffline,
  readCachedScoringSession,
  writeCachedScoringSession,
} from "@/lib/pwa/session-status-offline";
import {
  applyControlDeclinedOptimistic,
  applyControlGrantedOptimistic,
  applyControlRequestOptimistic,
  applyGiveControlOptimistic,
  applyKeepScoringOptimistic,
  sessionStatusFromApiBody,
  type PendingTransferState,
  type ScoringSessionStatusCore,
} from "@/lib/scoring/session-status-client";

export type ScoringSessionStatusState = ScoringSessionStatusCore & {
  loading: boolean;
};

export type ScoringControlRequestUiPhase =
  | "idle"
  | "waiting"
  | "declined"
  | "granted";

const empty: ScoringSessionStatusState = {
  authorized: false,
  scoring_role: "none",
  has_active_controller: false,
  pending_transfer: null,
  loading: true,
};

function cacheRole(matchId: string, core: ScoringSessionStatusCore) {
  writeCachedScoringSession(matchId, {
    authorized: core.authorized,
    scoring_role: core.scoring_role,
    has_active_controller: core.has_active_controller,
  });
}

export function useScoringSessionStatus(slug: string, matchId: string) {
  const [state, setState] = useState<ScoringSessionStatusState>(empty);
  const [isOnline, setIsOnline] = useState(true);
  const [requesterUiPhase, setRequesterUiPhase] =
    useState<ScoringControlRequestUiPhase>("idle");
  const [transferredAwayNotice, setTransferredAwayNotice] = useState(false);
  const stateRef = useRef(state);
  stateRef.current = state;

  useEffect(() => {
    const sync = () => setIsOnline(navigator.onLine);
    window.addEventListener("online", sync);
    window.addEventListener("offline", sync);
    sync();
    return () => {
      window.removeEventListener("online", sync);
      window.removeEventListener("offline", sync);
    };
  }, []);

  const applyCore = useCallback(
    (core: ScoringSessionStatusCore, opts?: { loading?: boolean }) => {
      setState((prev) => ({
        ...prev,
        ...core,
        loading: opts?.loading ?? false,
      }));
      cacheRole(matchId, core);
    },
    [matchId],
  );

  const refresh = useCallback(
    async (opts?: { silent?: boolean }) => {
      const prevRole = stateRef.current.scoring_role;
      const prevPending = stateRef.current.pending_transfer;

      try {
        const res = await fetch(
          `/api/scoring/session-status?slug=${encodeURIComponent(slug)}`,
          { credentials: "include" },
        );
        const body = await res.json().catch(() => ({}));
        if (!res.ok) {
          const cached = readCachedScoringSession(matchId);
          const merged = mergeSessionStatusForOffline(null, cached, isOnline);
          setState({
            authorized: merged?.authorized ?? false,
            scoring_role: merged?.scoring_role ?? "none",
            has_active_controller: merged?.has_active_controller ?? false,
            pending_transfer: null,
            loading: false,
          });
          return;
        }

        const core = sessionStatusFromApiBody(body);
        applyCore(core);

        if (
          prevRole === "viewer" &&
          core.scoring_role === "controller" &&
          prevPending?.direction === "outgoing"
        ) {
          setRequesterUiPhase("granted");
        } else if (
          prevRole === "viewer" &&
          prevPending?.direction === "outgoing" &&
          !core.pending_transfer &&
          core.scoring_role === "viewer"
        ) {
          setRequesterUiPhase((phase) =>
            phase === "waiting" ? "declined" : phase,
          );
        }

        if (
          prevRole === "controller" &&
          core.scoring_role === "viewer" &&
          !core.pending_transfer
        ) {
          setTransferredAwayNotice(true);
        }
      } catch {
        if (!opts?.silent) {
          const cached = readCachedScoringSession(matchId);
          const merged = mergeSessionStatusForOffline(null, cached, isOnline);
          setState({
            authorized: merged?.authorized ?? false,
            scoring_role: merged?.scoring_role ?? "none",
            has_active_controller: merged?.has_active_controller ?? false,
            pending_transfer: null,
            loading: false,
          });
        }
      }
    },
    [slug, matchId, isOnline, applyCore],
  );

  useEffect(() => {
    void refresh();
    const onFocus = () => void refresh({ silent: true });
    window.addEventListener("focus", onFocus);
    const fallback = window.setInterval(() => void refresh({ silent: true }), 60_000);
    return () => {
      window.removeEventListener("focus", onFocus);
      window.clearInterval(fallback);
    };
  }, [refresh, matchId]);

  useEffect(() => {
    let supabase: ReturnType<typeof createClient> | null = null;
    try {
      supabase = createClient();
    } catch {
      return;
    }

    const channel = supabase
      .channel(scoringControlChannelName(matchId))
      .on("broadcast", { event: SCORING_CONTROL_BROADCAST_EVENT }, (msg) => {
        const payload = msg.payload as ScoringControlBroadcastPayload | undefined;
        if (payload?.match_id && payload.match_id !== matchId) return;

        if (payload?.reason === "controller_changed") {
          setState((prev) => {
            if (prev.pending_transfer?.direction === "outgoing") {
              const next = applyControlGrantedOptimistic(prev);
              cacheRole(matchId, next);
              setRequesterUiPhase("granted");
              return { ...next, loading: false };
            }
            return prev;
          });
        } else if (
          payload?.reason === "transfer_responded" ||
          payload?.reason === "transfer_cancelled"
        ) {
          setState((prev) => {
            if (prev.pending_transfer?.direction === "incoming") {
              const next = applyKeepScoringOptimistic(
                prev,
                prev.pending_transfer.id,
              );
              cacheRole(matchId, next);
              return { ...next, loading: false };
            }
            if (prev.pending_transfer?.direction === "outgoing") {
              const next = applyControlDeclinedOptimistic(prev);
              cacheRole(matchId, next);
              setRequesterUiPhase("declined");
              return { ...next, loading: false };
            }
            return prev;
          });
        }

        void refresh({ silent: true });
      })
      .subscribe();

    return () => {
      void supabase?.removeChannel(channel);
    };
  }, [matchId, refresh]);

  const requestScoringControl = useCallback(async () => {
    setRequesterUiPhase("waiting");
    try {
      const res = await fetch("/api/scoring/control/request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ match_id: matchId }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) {
        setRequesterUiPhase("idle");
        return { ok: false as const, error: body.error ?? "Could not request control." };
      }

      const transferId = body.transfer_id as string;
      setState((prev) => {
        const next = applyControlRequestOptimistic(prev, transferId);
        cacheRole(matchId, next);
        return { ...next, loading: false };
      });
      return { ok: true as const };
    } catch {
      setRequesterUiPhase("idle");
      return { ok: false as const, error: "Could not request control." };
    }
  }, [matchId]);

  const cancelScoringControlRequest = useCallback(async () => {
    const prev = stateRef.current;
    setState((s) => {
      const next = applyControlDeclinedOptimistic(s);
      cacheRole(matchId, next);
      return { ...s, ...next };
    });
    setRequesterUiPhase("idle");

    try {
      const res = await fetch("/api/scoring/control/cancel", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ match_id: matchId }),
      });
      if (!res.ok) {
        setState({ ...prev, loading: false });
        cacheRole(matchId, prev);
        return { ok: false as const };
      }
      return { ok: true as const };
    } catch {
      setState({ ...prev, loading: false });
      cacheRole(matchId, prev);
      return { ok: false as const };
    }
  }, [matchId]);

  const respondToTransfer = useCallback(
    async (action: "keep" | "transfer") => {
      const transferId = stateRef.current.pending_transfer?.id;
      if (!transferId) return { ok: false as const, error: "No pending request." };

      const snapshot = stateRef.current;

      if (action === "keep") {
        setState((prev) => {
          const next = applyKeepScoringOptimistic(prev, transferId);
          cacheRole(matchId, next);
          return { ...prev, ...next };
        });
      } else {
        setTransferredAwayNotice(true);
        setState((prev) => {
          const next = applyGiveControlOptimistic(prev);
          cacheRole(matchId, next);
          return { ...prev, ...next };
        });
      }

      try {
        const res = await fetch("/api/scoring/control/respond", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({
            match_id: matchId,
            transfer_id: transferId,
            action,
          }),
        });
        const body = await res.json().catch(() => ({}));
        if (!res.ok) {
          setState({ ...snapshot, loading: false });
          cacheRole(matchId, snapshot);
          if (action === "transfer") setTransferredAwayNotice(false);
          return {
            ok: false as const,
            error: body.error ?? "Could not update transfer.",
          };
        }

        if (action === "transfer") {
          setRequesterUiPhase("idle");
        }

        void refresh({ silent: true });
        return { ok: true as const };
      } catch {
        setState({ ...snapshot, loading: false });
        cacheRole(matchId, snapshot);
        if (action === "transfer") setTransferredAwayNotice(false);
        return { ok: false as const, error: "Could not update transfer." };
      }
    },
    [matchId, refresh],
  );

  const clearRequesterNotice = useCallback(() => {
    setRequesterUiPhase("idle");
  }, []);

  const incomingTransfer: PendingTransferState | null =
    state.pending_transfer?.direction === "incoming"
      ? state.pending_transfer
      : null;

  return {
    ...state,
    refresh,
    isOnline,
    requestScoringControl,
    cancelScoringControlRequest,
    respondToTransfer,
    requesterUiPhase,
    clearRequesterNotice,
    incomingTransfer,
    transferredAwayNotice,
    setTransferredAwayNotice,
  };
}

export type ScoringSessionStatusHook = ReturnType<
  typeof useScoringSessionStatus
>;
