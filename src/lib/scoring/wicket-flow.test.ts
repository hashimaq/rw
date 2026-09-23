import { describe, expect, it } from "vitest";
import {
  dismissedStrikerForAutoWicket,
  isStrikerAutoDismissal,
  requiresDismissedBatsmanSelection,
  requiresFielder,
  resolveWicketDismissed,
  validateWicketConfirm,
} from "@/lib/scoring/wicket-flow";
import {
  applyDeliveryToState,
  createEmptyInningsState,
} from "@/lib/scoring-engine/build-state";
import {
  buildNormalRunDelivery,
  buildWicketDelivery,
  type ActiveParticipants,
} from "@/lib/scoring-engine/delivery-builders";
import { syncCreaseRefsFromEngineState } from "@/lib/scoring/crease-sync";
import { participantKey } from "@/lib/scoring-engine/utils";

const A = "11111111-1111-4111-8111-111111111111";
const B = "22222222-2222-4222-8222-222222222222";
const C = "33333333-3333-4333-8333-333333333333";

const P: ActiveParticipants = {
  strikerPlayerId: A,
  strikerName: "Ahmed",
  nonStrikerPlayerId: B,
  nonStrikerName: "Bilal",
  bowlerPlayerId: C,
  bowlerName: "Bowler",
};

describe("wicket flow rules", () => {
  it("auto-dismisses striker for bowled, caught, lbw, hit wicket, stumped", () => {
    expect(isStrikerAutoDismissal("bowled")).toBe(true);
    expect(isStrikerAutoDismissal("caught")).toBe(true);
    expect(isStrikerAutoDismissal("lbw")).toBe(true);
    expect(isStrikerAutoDismissal("hit_wicket")).toBe(true);
    expect(isStrikerAutoDismissal("stumped")).toBe(true);
    expect(isStrikerAutoDismissal("run_out")).toBe(false);
  });

  it("requires batsman selection only for run out (and retired/other)", () => {
    expect(requiresDismissedBatsmanSelection("run_out")).toBe(true);
    expect(requiresDismissedBatsmanSelection("bowled")).toBe(false);
  });

  it("requires fielder for caught and run out", () => {
    expect(requiresFielder("caught")).toBe(true);
    expect(requiresFielder("run_out")).toBe(true);
    expect(requiresFielder("stumped")).toBe(true);
    expect(requiresFielder("bowled")).toBe(false);
  });

  it("rejects caught without fielder", () => {
    expect(
      validateWicketConfirm({
        wicketType: "caught",
        dismissed: { playerId: A, name: "Ahmed" },
        fielder: null,
      }),
    ).toMatch(/Fielder name is required/);
  });

  it("rejects run out without dismissed batsman or fielder", () => {
    expect(
      validateWicketConfirm({
        wicketType: "run_out",
        dismissed: { playerId: null, name: "   " },
        fielder: { playerId: C, name: "Fielder" },
      }),
    ).toMatch(/Select which batsman was run out/);

    expect(
      validateWicketConfirm({
        wicketType: "run_out",
        dismissed: { playerId: B, name: "Bilal" },
        fielder: null,
      }),
    ).toMatch(/Fielder name is required/);
  });

  it("accepts valid caught and run out", () => {
    expect(
      validateWicketConfirm({
        wicketType: "caught",
        dismissed: { playerId: A, name: "Ahmed" },
        fielder: { playerId: B, name: "Bilal" },
      }),
    ).toBeNull();

    expect(
      validateWicketConfirm({
        wicketType: "run_out",
        dismissed: { playerId: B, name: "Bilal" },
        fielder: { playerId: A, name: "Ahmed" },
      }),
    ).toBeNull();
  });
});

describe("resolveWicketDismissed", () => {
  it("ignores wrong scorer pick for bowled and uses engine striker", () => {
    const resolved = resolveWicketDismissed(
      "bowled",
      { playerId: B, name: "Bilal" },
      { playerId: A, name: "Ahmed" },
      { playerId: A, name: "Ahmed" },
    );
    expect(resolved?.name).toBe("Bilal");
  });

  it("accepts run out selection at crease only", () => {
    expect(
      resolveWicketDismissed(
        "run_out",
        { playerId: A, name: "Ahmed" },
        { playerId: B, name: "Bilal" },
        { playerId: B, name: "Bilal" },
      )?.name,
    ).toBe("Bilal");
    expect(
      resolveWicketDismissed(
        "run_out",
        { playerId: A, name: "Ahmed" },
        { playerId: B, name: "Bilal" },
        { playerId: null, name: "Stranger" },
      ),
    ).toBeNull();
  });
});

describe("strikerKey after strike rotation", () => {
  it("uses engine striker after odd run before wicket", () => {
    let s = createEmptyInningsState(20);
    s = applyDeliveryToState(s, buildNormalRunDelivery(s, P, "d1", 1));
    const crease = syncCreaseRefsFromEngineState(s);
    expect(crease.striker?.name).toBe("Bilal");

    const auto = dismissedStrikerForAutoWicket(crease.striker);
    expect(auto?.name).toBe("Bilal");

    const w = buildWicketDelivery(s, P, "w1", {
      wicketType: "bowled",
      dismissedPlayerId: auto!.playerId,
      dismissedPlayerName: auto!.name,
    });
    s = applyDeliveryToState(s, w);
    expect(s.batters[participantKey(A, "Ahmed")]!.isOut).toBe(false);
    expect(s.batters[participantKey(B, "Bilal")]!.isOut).toBe(true);
  });
});

describe("delivery rebuild preserves fielder", () => {
  it("keeps caught fielder on rebuilt state", () => {
    let s = createEmptyInningsState(20);
    const w = buildWicketDelivery(s, P, "w1", {
      wicketType: "caught",
      dismissedPlayerId: A,
      dismissedPlayerName: "Ahmed",
      fielderPlayerId: B,
      fielderName: "Bilal",
    });
    s = applyDeliveryToState(s, w);
    expect(s.batters[participantKey(A, "Ahmed")]!.dismissalLabel).toContain(
      "c Bilal",
    );
  });
});
