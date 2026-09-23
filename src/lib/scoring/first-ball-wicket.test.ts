import { describe, expect, it } from "vitest";
import {
  applyDeliveryToState,
  buildInningsStateFromDeliveries,
  createEmptyInningsState,
} from "@/lib/scoring-engine/build-state";
import {
  buildCreaseCorrectionDelivery,
  buildWicketDelivery,
  type ActiveParticipants,
} from "@/lib/scoring-engine/delivery-builders";
import {
  authoritativeCreaseRefs,
  syncCreaseRefsFromEngineState,
} from "@/lib/scoring/crease-sync";
import {
  deriveScoringPhase,
  scoringUiSnapshotFromEngineState,
  wicketReplacementSlotFromEngineState,
} from "@/lib/scoring/scoring-phase";
import {
  dismissedStrikerForAutoWicket,
  resolveWicketDismissed,
} from "@/lib/scoring/wicket-flow";
import { participantKey } from "@/lib/scoring-engine/utils";

const A = "11111111-1111-4111-8111-111111111111";
const B = "22222222-2222-4222-8222-222222222222";
const C = "33333333-3333-4333-8333-333333333333";
const X = "44444444-4444-4444-8444-444444444444";

const P: ActiveParticipants = {
  strikerPlayerId: A,
  strikerName: "A",
  nonStrikerPlayerId: B,
  nonStrikerName: "B",
  bowlerPlayerId: X,
  bowlerName: "X",
};

const aKey = participantKey(A, "A");
const bKey = participantKey(B, "B");
const cKey = participantKey(C, "C");

const ctx = { inningsNumber: 1 as const };

const pending = {
  striker: { playerId: A, name: "A" },
  nonStriker: { playerId: B, name: "B" },
};

describe("first-ball wicket", () => {
  it.each([
    ["bowled", {}],
    ["caught", { fielderName: "F" }],
    ["lbw", {}],
    ["hit_wicket", {}],
    ["stumped", { fielderName: "WK" }],
  ] as const)("%s on first delivery", (wicketType, extra) => {
    let s = createEmptyInningsState(20);
    expect(s.legalBalls).toBe(0);
    const crease = authoritativeCreaseRefs(s, pending);
    expect(crease.striker?.name).toBe("A");
    expect(dismissedStrikerForAutoWicket(crease.striker)).not.toBeNull();

    const w = buildWicketDelivery(s, P, "w1", {
      wicketType,
      dismissedPlayerId: A,
      dismissedPlayerName: "A",
      ...extra,
    });
    s = applyDeliveryToState(s, w);

    expect(s.wickets).toBe(1);
    expect(s.batters[aKey].isOut).toBe(true);
    expect(s.batters[bKey].isOut).toBe(false);
    expect(deriveScoringPhase(s, ctx)).toBe("need_batter");
    expect(wicketReplacementSlotFromEngineState(s)).toBe("striker");

    const snap = scoringUiSnapshotFromEngineState(s, ctx);
    expect(snap.striker).toBeNull();
    expect(snap.nonStriker?.name).toBe("B");

    s = applyDeliveryToState(
      s,
      buildCreaseCorrectionDelivery(
        s,
        {
          ...P,
          strikerPlayerId: C,
          strikerName: "C",
          nonStrikerPlayerId: B,
          nonStrikerName: "B",
        },
        "c1",
      ),
    );
    expect(s.strikerKey).toBe(cKey);
    expect(s.nonStrikerKey).toBe(bKey);
    expect(scoringUiSnapshotFromEngineState(s, ctx).phase).toBe("scoring");
  });

  it("run out striker on first ball", () => {
    let s = createEmptyInningsState(20);
    const crease = authoritativeCreaseRefs(s, pending);
    const dismissed = resolveWicketDismissed(
      "run_out",
      crease.striker,
      crease.nonStriker,
      { playerId: A, name: "A" },
    );
    expect(dismissed?.name).toBe("A");
    s = applyDeliveryToState(
      s,
      buildWicketDelivery(s, P, "ro", {
        wicketType: "run_out",
        dismissedPlayerId: A,
        dismissedPlayerName: "A",
        fielderName: "F",
      }),
    );
    expect(wicketReplacementSlotFromEngineState(s)).toBe("striker");
  });

  it("run out non-striker on first ball", () => {
    let s = createEmptyInningsState(20);
    s = applyDeliveryToState(
      s,
      buildWicketDelivery(s, P, "ro-b", {
        wicketType: "run_out",
        dismissedPlayerId: B,
        dismissedPlayerName: "B",
        fielderName: "F",
      }),
    );
    expect(wicketReplacementSlotFromEngineState(s)).toBe("non_striker");
    const crease = syncCreaseRefsFromEngineState(s);
    expect(crease.striker?.name).toBe("A");
    expect(crease.nonStriker).toBeNull();
  });

  it("rebuild after first-ball wicket + replacement", () => {
    let s = createEmptyInningsState(20);
    const w = buildWicketDelivery(s, P, "w", {
      wicketType: "bowled",
      dismissedPlayerId: A,
      dismissedPlayerName: "A",
    });
    s = applyDeliveryToState(s, w);
    const c = buildCreaseCorrectionDelivery(
      s,
      {
        ...P,
        strikerPlayerId: C,
        strikerName: "C",
      },
      "c",
    );
    s = applyDeliveryToState(s, c);
    const rebuilt = buildInningsStateFromDeliveries(s.deliveries, 20);
    expect(rebuilt.strikerKey).toBe(cKey);
    expect(rebuilt.totalRuns).toBe(0);
    expect(rebuilt.wickets).toBe(1);
  });
});
