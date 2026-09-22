import { describe, expect, it } from "vitest";
import { matchSetupCreateSchema } from "@/lib/validation/match-setup";
import {
  buildLineupPayload,
  clearMatchPool,
  createEmptyLineupState,
  playerKey,
  selectAllOfficialInMatchPool,
  xiSelectedCount,
  type WizardLineupState,
} from "@/lib/match-setup/build-payload";

function lineupWithNOfficial(n: number): WizardLineupState {
  const state = createEmptyLineupState();
  const ids = Array.from({ length: n }, (_, i) =>
    `00000000-0000-4000-8000-${String(i + 1).padStart(12, "0")}`,
  );
  let next = state;
  for (const id of ids) {
    next = {
      ...next,
      xiSlots: [...next.xiSlots, playerKey(id)],
    };
  }
  next.captainKey = playerKey(ids[0]!);
  next.wicketkeeperKey = playerKey(ids[1]!);
  return next;
}

function apiPayloadFromState(state: WizardLineupState) {
  const lineup = buildLineupPayload(state);
  return {
    opponent_name: "Stars",
    overs_limit: 20,
    red_wings_role: "batting" as const,
    red_wings_innings: 1 as const,
    lineup,
    scorer_pin: "1234",
  };
}

describe("flexible match player pool", () => {
  it("selecting 11 players succeeds validation", () => {
    const state = lineupWithNOfficial(11);
    expect(xiSelectedCount(state)).toBe(11);
    expect(() =>
      matchSetupCreateSchema.parse(apiPayloadFromState(state)),
    ).not.toThrow();
  });

  it("selecting 12 players succeeds validation", () => {
    const state = lineupWithNOfficial(12);
    expect(xiSelectedCount(state)).toBe(12);
    expect(() =>
      matchSetupCreateSchema.parse(apiPayloadFromState(state)),
    ).not.toThrow();
  });

  it("selecting 15 players succeeds validation", () => {
    const state = lineupWithNOfficial(15);
    expect(xiSelectedCount(state)).toBe(15);
    const parsed = matchSetupCreateSchema.parse(apiPayloadFromState(state));
    expect(parsed.lineup.filter((e) => e.squad_status === "playing_xi")).toHaveLength(
      15,
    );
  });

  it("select all adds every official player", () => {
    const ids = Array.from({ length: 15 }, (_, i) => `p-${i}`);
    const empty = createEmptyLineupState();
    const next = selectAllOfficialInMatchPool(empty, ids);
    expect(xiSelectedCount(next)).toBe(15);
    expect(next.xiSlots).toEqual(ids.map(playerKey));
  });

  it("select all preserves guests already in pool", () => {
    const withGuest: WizardLineupState = {
      ...createEmptyLineupState(),
      guests: [{ full_name: "Guest One" }],
      xiSlots: ["guest:0"],
      captainKey: "guest:0",
      wicketkeeperKey: "guest:0",
    };
    const ids = ["a", "b"];
    const next = selectAllOfficialInMatchPool(withGuest, ids);
    expect(next.xiSlots).toContain("guest:0");
    expect(next.xiSlots).toHaveLength(3);
  });

  it("clear all removes match pool but keeps guest drafts", () => {
    const state: WizardLineupState = {
      ...lineupWithNOfficial(5),
      guests: [{ full_name: "Guest" }],
    };
    const cleared = clearMatchPool(state);
    expect(cleared.xiSlots).toHaveLength(0);
    expect(cleared.guests).toHaveLength(1);
    expect(cleared.captainKey).toBeNull();
  });

  it("buildLineupPayload has no duplicate official ids", () => {
    const state = lineupWithNOfficial(15);
    const lineup = buildLineupPayload(state);
    const ids = lineup
      .filter((e) => e.kind === "official")
      .map((e) => (e.kind === "official" ? e.player_id : ""));
    expect(new Set(ids).size).toBe(15);
  });

  it("15-player payload exposes full pool for playing_xi", () => {
    const state = lineupWithNOfficial(15);
    const playing = buildLineupPayload(state).filter(
      (e) => e.squad_status === "playing_xi",
    );
    expect(playing).toHaveLength(15);
  });
});
