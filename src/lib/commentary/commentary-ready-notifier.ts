import "server-only";

export type CommentaryReadyMeta = {
  clientEventId: string;
  matchId: string;
  inningsId: string;
  sequenceInInnings: number;
  failed?: boolean;
  errorMessage?: string | null;
};

const readyByClientEventId = new Map<string, CommentaryReadyMeta>();

type Waiter = () => void;
const waitersByClientEventId = new Map<string, Set<Waiter>>();

export function markCommentaryReadyForController(meta: CommentaryReadyMeta): void {
  readyByClientEventId.set(meta.clientEventId, meta);
  const waiters = waitersByClientEventId.get(meta.clientEventId);
  if (waiters) {
    for (const wake of waiters) wake();
    waitersByClientEventId.delete(meta.clientEventId);
  }
}

export function getCommentaryReadyMeta(
  clientEventId: string,
): CommentaryReadyMeta | null {
  return readyByClientEventId.get(clientEventId) ?? null;
}

export function waitForCommentaryReadySignal(
  clientEventId: string,
  maxMs: number,
): Promise<CommentaryReadyMeta | null> {
  const existing = readyByClientEventId.get(clientEventId);
  if (existing) return Promise.resolve(existing);

  return new Promise((resolve) => {
    let settled = false;
    const finish = (meta: CommentaryReadyMeta | null) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      const set = waitersByClientEventId.get(clientEventId);
      if (set) {
        set.delete(wake);
        if (set.size === 0) waitersByClientEventId.delete(clientEventId);
      }
      resolve(meta);
    };

    const wake = () => {
      finish(readyByClientEventId.get(clientEventId) ?? null);
    };

    const timer = setTimeout(() => finish(null), maxMs);

    let set = waitersByClientEventId.get(clientEventId);
    if (!set) {
      set = new Set();
      waitersByClientEventId.set(clientEventId, set);
    }
    set.add(wake);
  });
}

/** Test helper */
export function resetCommentaryReadyNotifierForTests(): void {
  readyByClientEventId.clear();
  waitersByClientEventId.clear();
}
