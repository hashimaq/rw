import { describe, expect, it } from "vitest";
import { buildRecordsFromCareerSnapshot } from "@/lib/statistics/records-from-snapshot";
import { emptyPlayerCareerStats } from "@/lib/statistics/player-career";
import type { Player } from "@/lib/database/types";

const P1 = "11111111-1111-4111-8111-111111111111";

const players: Player[] = [
  {
    id: P1,
    full_name: "Hashim",
    jersey_number: 1,
    role: null,
    batting_style: null,
    bowling_style: null,
    date_of_birth: null,
    joined_date: null,
    is_active: true,
    archived_at: null,
    is_official_squad: true,
    created_at: "",
    updated_at: "",
  },
];

describe("buildRecordsFromCareerSnapshot", () => {
  it("picks career run leader from snapshot stats", () => {
    const stats = emptyPlayerCareerStats(P1);
    stats.runs = 120;
    stats.wickets = 3;
    stats.highestScore = 45;
    const rows = buildRecordsFromCareerSnapshot(
      { statsByPlayerId: { [P1]: stats }, recentByPlayerId: {} },
      players,
    );
    const runs = rows.find((r) => r.id === "most-runs");
    expect(runs?.playerId).toBe(P1);
    expect(runs?.value).toBe("120");
  });
});
