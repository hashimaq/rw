import type { LineupEntry } from "@/lib/validation/match-setup";
import type { Player } from "@/lib/database/types";

export type GuestDraft = {
  full_name: string;
  jersey_number?: number | null;
};

export type WizardLineupState = {
  /** Ordered available match players — player UUID or `guest:N`. */
  xiSlots: string[];
  /** Optional bench — same key format (not in live batting/bowling pool). */
  benchKeys: string[];
  guests: GuestDraft[];
  captainKey: string | null;
  wicketkeeperKey: string | null;
};

export function createEmptyLineupState(): WizardLineupState {
  return {
    xiSlots: [],
    benchKeys: [],
    guests: [],
    captainKey: null,
    wicketkeeperKey: null,
  };
}

export function playerKey(id: string): string {
  return id;
}

export function guestKey(index: number): string {
  return `guest:${index}`;
}

export function parseLineupKey(
  key: string,
): { kind: "official"; id: string } | { kind: "guest"; index: number } {
  if (key.startsWith("guest:")) {
    return { kind: "guest", index: Number(key.slice(6)) };
  }
  return { kind: "official", id: key };
}

export function xiSelectedCount(state: WizardLineupState): number {
  return state.xiSlots.length;
}

export function isKeyInXi(state: WizardLineupState, key: string): boolean {
  return state.xiSlots.includes(key);
}

export function isKeyOnBench(state: WizardLineupState, key: string): boolean {
  return state.benchKeys.includes(key);
}

export function isKeySelected(state: WizardLineupState, key: string): boolean {
  return isKeyInXi(state, key) || isKeyOnBench(state, key);
}

export function addKeyToMatchPool(
  state: WizardLineupState,
  key: string,
): WizardLineupState {
  if (state.xiSlots.includes(key)) return state;
  const benchKeys = state.benchKeys.filter((k) => k !== key);
  return { ...state, xiSlots: [...state.xiSlots, key], benchKeys };
}

/** @deprecated alias */
export const addKeyToNextXiSlot = addKeyToMatchPool;

export function removeKeyFromXiByKey(
  state: WizardLineupState,
  key: string,
): WizardLineupState {
  if (!state.xiSlots.includes(key)) return state;
  const xiSlots = state.xiSlots.filter((k) => k !== key);
  let captainKey = state.captainKey;
  let wicketkeeperKey = state.wicketkeeperKey;
  if (captainKey === key) captainKey = null;
  if (wicketkeeperKey === key) wicketkeeperKey = null;
  return { ...state, xiSlots, captainKey, wicketkeeperKey };
}

export function removeKeyFromXi(
  state: WizardLineupState,
  slotIndex: number,
): WizardLineupState {
  const key = state.xiSlots[slotIndex];
  if (!key) return state;
  return removeKeyFromXiByKey(state, key);
}

/** 1-based selection order (order keys were added). */
export function xiSelectionOrder(
  state: WizardLineupState,
  key: string,
): number | null {
  const idx = state.xiSlots.indexOf(key);
  if (idx === -1) return null;
  return idx + 1;
}

export function toggleBenchKey(
  state: WizardLineupState,
  key: string,
): WizardLineupState {
  if (isKeyInXi(state, key)) return state;
  const onBench = state.benchKeys.includes(key);
  const benchKeys = onBench
    ? state.benchKeys.filter((k) => k !== key)
    : [...state.benchKeys, key];
  return { ...state, benchKeys };
}

/** Select every official player not already in the match pool. Preserves guests already selected. */
export function selectAllOfficialInMatchPool(
  state: WizardLineupState,
  officialPlayerIds: string[],
): WizardLineupState {
  let next = state;
  for (const id of officialPlayerIds) {
    const key = playerKey(id);
    if (isKeyInXi(next, key)) continue;
    next = addKeyToMatchPool(next, key);
  }
  return next;
}

/** Clear match pool selections. Guest drafts in `guests` remain for re-add. */
export function clearMatchPool(state: WizardLineupState): WizardLineupState {
  return {
    ...state,
    xiSlots: [],
    captainKey: null,
    wicketkeeperKey: null,
  };
}

function entryFromKey(
  key: string,
  state: WizardLineupState,
  squad_status: "playing_xi" | "bench",
): LineupEntry | null {
  const parsed = parseLineupKey(key);
  const isCaptain = state.captainKey === key;
  const isWk = state.wicketkeeperKey === key;

  if (parsed.kind === "official") {
    return {
      kind: "official",
      player_id: parsed.id,
      squad_status,
      is_captain: isCaptain,
      is_wicketkeeper: isWk,
    };
  }

  const guest = state.guests[parsed.index];
  if (!guest?.full_name.trim()) return null;

  return {
    kind: "guest",
    full_name: guest.full_name.trim(),
    jersey_number:
      guest.jersey_number !== undefined && guest.jersey_number !== null
        ? guest.jersey_number
        : null,
    squad_status,
    is_captain: isCaptain,
    is_wicketkeeper: isWk,
  };
}

export function buildLineupPayload(state: WizardLineupState): LineupEntry[] {
  const entries: LineupEntry[] = [];

  for (const key of state.xiSlots) {
    const entry = entryFromKey(key, state, "playing_xi");
    if (entry) entries.push(entry);
  }

  for (const key of state.benchKeys) {
    const entry = entryFromKey(key, state, "bench");
    if (entry) entries.push(entry);
  }

  return entries;
}

export function resolveKeyDisplayName(
  key: string,
  state: WizardLineupState,
  playersById: Map<string, Player>,
): string {
  const parsed = parseLineupKey(key);
  if (parsed.kind === "official") {
    return playersById.get(parsed.id)?.full_name ?? "Player";
  }
  const guest = state.guests[parsed.index];
  return guest?.full_name.trim() || "Guest";
}

export function isGuestKeyReady(
  key: string,
  state: WizardLineupState,
): boolean {
  const parsed = parseLineupKey(key);
  if (parsed.kind !== "guest") return true;
  return Boolean(state.guests[parsed.index]?.full_name.trim());
}

/** Match pool keys available for batting/bowling (same as xiSlots). */
export function matchPoolKeys(state: WizardLineupState): string[] {
  return [...state.xiSlots];
}
