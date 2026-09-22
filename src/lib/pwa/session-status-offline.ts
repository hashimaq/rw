export const SCORING_SESSION_CACHE_PREFIX = "rw_scoring_session_cache:";

export interface CachedScoringSessionStatus {
  scoring_role: "none" | "controller" | "viewer";
  has_active_controller: boolean;
  authorized: boolean;
  cached_at: string;
}

export function scoringSessionCacheKey(matchId: string): string {
  return `${SCORING_SESSION_CACHE_PREFIX}${matchId}`;
}

export function readCachedScoringSession(
  matchId: string,
): CachedScoringSessionStatus | null {
  if (typeof localStorage === "undefined") return null;
  try {
    const raw = localStorage.getItem(scoringSessionCacheKey(matchId));
    if (!raw) return null;
    return JSON.parse(raw) as CachedScoringSessionStatus;
  } catch {
    return null;
  }
}

export function writeCachedScoringSession(
  matchId: string,
  status: Omit<CachedScoringSessionStatus, "cached_at">,
): void {
  if (typeof localStorage === "undefined") return;
  const payload: CachedScoringSessionStatus = {
    ...status,
    cached_at: new Date().toISOString(),
  };
  localStorage.setItem(
    scoringSessionCacheKey(matchId),
    JSON.stringify(payload),
  );
}

/** When offline, keep last known controller role so scoring is not blocked. */
export function mergeSessionStatusForOffline(
  live: CachedScoringSessionStatus | null,
  cached: CachedScoringSessionStatus | null,
  isOnline: boolean,
): CachedScoringSessionStatus | null {
  if (isOnline) return live;
  if (live?.authorized) return live;
  if (cached?.scoring_role === "controller") return cached;
  return live ?? cached;
}
