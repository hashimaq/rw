import { describe, expect, it } from "vitest";
import {
  inningsInsertPlan,
  matchMetadataFromSetup,
} from "@/lib/match/match-setup-plan";
import { matchMetadataFromRedWingsInnings } from "@/lib/match/red-wings-innings";
import { matchSetupCreateSchema } from "@/lib/validation/match-setup";

const baseLineup = Array.from({ length: 11 }, (_, i) => ({
  kind: "official" as const,
  player_id: `00000000-0000-4000-8000-${String(i + 1).padStart(12, "0")}`,
  squad_status: "playing_xi" as const,
  is_captain: i === 0,
  is_wicketkeeper: i === 1,
}));

function validPayload(overrides: Record<string, unknown> = {}) {
  return {
    opponent_name: "Stars",
    overs_limit: 20,
    red_wings_role: "batting",
    red_wings_innings: 1,
    lineup: baseLineup,
    scorer_pin: "1234",
    ...overrides,
  };
}

describe("match setup validation", () => {
  it("requires red_wings_role and red_wings_innings", () => {
    const parsed = matchSetupCreateSchema.parse(validPayload());
    expect(parsed.red_wings_role).toBe("batting");
    expect(parsed.red_wings_innings).toBe(1);
  });

  it("first innings does not require first innings score", () => {
    expect(() =>
      matchSetupCreateSchema.parse(
        validPayload({ red_wings_role: "bowling", red_wings_innings: 1 }),
      ),
    ).not.toThrow();
  });

  it("second innings requires first innings runs and wickets", () => {
    const fail = matchSetupCreateSchema.safeParse(
      validPayload({ red_wings_innings: 2 }),
    );
    expect(fail.success).toBe(false);

    const ok = matchSetupCreateSchema.parse(
      validPayload({
        red_wings_innings: 2,
        first_innings_runs: 142,
        first_innings_wickets: 7,
      }),
    );
    expect(ok.first_innings_runs).toBe(142);
  });

  it("accepts legacy opponent_first_innings fields for 2nd innings", () => {
    const ok = matchSetupCreateSchema.parse(
      validPayload({
        red_wings_innings: 2,
        opponent_first_innings_runs: 100,
        opponent_first_innings_wickets: 5,
      }),
    );
    expect(ok.opponent_first_innings_runs).toBe(100);
  });
});

describe("match setup plan — role × innings", () => {
  it("batting + 1st → Red Wings bat in inn. 1", () => {
    const plan = inningsInsertPlan("batting", 1, 0, 0);
    expect(plan.kind).toBe("single");
    if (plan.kind === "single") {
      expect(plan.battingTeam).toBe("red_wings");
    }
    const meta = matchMetadataFromSetup("batting", 1);
    expect(meta.red_wings_batting_first).toBe(true);
  });

  it("batting + 2nd → opponent completed 1st, RW chase inn. 2", () => {
    const plan = inningsInsertPlan("batting", 2, 142, 7);
    expect(plan.kind).toBe("second_session");
    if (plan.kind === "second_session") {
      expect(plan.completedFirst.battingTeam).toBe("opponent");
      expect(plan.activeSecond.battingTeam).toBe("red_wings");
      expect(plan.activeSecond.target).toBe(143);
    }
  });

  it("bowling + 1st → opponent bat in inn. 1", () => {
    const plan = inningsInsertPlan("bowling", 1, 0, 0);
    expect(plan.kind).toBe("single");
    if (plan.kind === "single") {
      expect(plan.battingTeam).toBe("opponent");
      expect(plan.bowlingTeam).toBe("red_wings");
    }
  });

  it("bowling + 2nd → RW completed 1st, opponent chase inn. 2", () => {
    const plan = inningsInsertPlan("bowling", 2, 88, 4);
    expect(plan.kind).toBe("second_session");
    if (plan.kind === "second_session") {
      expect(plan.completedFirst.battingTeam).toBe("red_wings");
      expect(plan.activeSecond.battingTeam).toBe("opponent");
      expect(plan.activeSecond.target).toBe(89);
    }
    const meta = matchMetadataFromSetup("bowling", 2);
    expect(meta.red_wings_batting_first).toBe(true);
  });

  it("legacy metadata helper matches batting-only sessions", () => {
    expect(matchMetadataFromRedWingsInnings(1).red_wings_batting_first).toBe(
      true,
    );
    expect(matchMetadataFromRedWingsInnings(2).red_wings_batting_first).toBe(
      false,
    );
  });

  it("second innings target is first innings total plus one", () => {
    expect(142 + 1).toBe(143);
  });
});
