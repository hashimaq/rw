"use client";

import { useCallback, useEffect, useState } from "react";
import {
  mergeSessionStatusForOffline,
  readCachedScoringSession,
  writeCachedScoringSession,
} from "@/lib/pwa/session-status-offline";

export type ScoringSessionStatusState = {
  authorized: boolean;
  scoring_role: "none" | "controller" | "viewer";
  has_active_controller: boolean;
  pending_transfer: {
    id: string;
    direction: "incoming" | "outgoing";
  } | null;
  loading: boolean;
};

const empty: ScoringSessionStatusState = {
  authorized: false,
  scoring_role: "none",
  has_active_controller: false,
  pending_transfer: null,
  loading: true,
};

export function useScoringSessionStatus(slug: string, matchId: string) {
  const [state, setState] = useState<ScoringSessionStatusState>(empty);
  const [isOnline, setIsOnline] = useState(true);

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

  const refresh = useCallback(async () => {
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
      const next = {
        authorized: Boolean(body.authorized),
        scoring_role: body.scoring_role ?? "none",
        has_active_controller: Boolean(body.has_active_controller),
        pending_transfer: body.pending_transfer ?? null,
        loading: false,
      };
      writeCachedScoringSession(matchId, {
        authorized: next.authorized,
        scoring_role: next.scoring_role,
        has_active_controller: next.has_active_controller,
      });
      setState(next);
    } catch {
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
  }, [slug, matchId, isOnline]);

  useEffect(() => {
    void refresh();
    const onFocus = () => void refresh();
    window.addEventListener("focus", onFocus);
    const interval = window.setInterval(() => void refresh(), 20_000);
    return () => {
      window.removeEventListener("focus", onFocus);
      window.clearInterval(interval);
    };
  }, [refresh, matchId]);

  return { ...state, refresh, isOnline };
}
