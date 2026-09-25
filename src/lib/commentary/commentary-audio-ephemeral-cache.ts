import "server-only";

type CachedCommentaryAudio = {
  matchId: string;
  buffer: Buffer;
  mimeType: string;
  expiresAtMs: number;
};

const TTL_MS = 20 * 60 * 1000;
const MAX_ENTRIES = 48;

const globalStore = globalThis as unknown as {
  __rwCommentaryAudioCache?: Map<string, CachedCommentaryAudio>;
};

function cacheMap(): Map<string, CachedCommentaryAudio> {
  if (!globalStore.__rwCommentaryAudioCache) {
    globalStore.__rwCommentaryAudioCache = new Map();
  }
  return globalStore.__rwCommentaryAudioCache;
}

function evictIfNeeded(map: Map<string, CachedCommentaryAudio>): void {
  const now = Date.now();
  for (const [key, entry] of map) {
    if (entry.expiresAtMs <= now) map.delete(key);
  }
  while (map.size > MAX_ENTRIES) {
    const first = map.keys().next().value;
    if (first) map.delete(first);
  }
}

export function putCommentaryAudioInEphemeralCache(
  clientEventId: string,
  matchId: string,
  buffer: Buffer,
  mimeType: string,
): void {
  const map = cacheMap();
  evictIfNeeded(map);
  map.set(clientEventId, {
    matchId,
    buffer,
    mimeType,
    expiresAtMs: Date.now() + TTL_MS,
  });
}

export function getCommentaryAudioFromEphemeralCache(
  clientEventId: string,
): CachedCommentaryAudio | null {
  const map = cacheMap();
  const entry = map.get(clientEventId);
  if (!entry) return null;
  if (entry.expiresAtMs <= Date.now()) {
    map.delete(clientEventId);
    return null;
  }
  return entry;
}
