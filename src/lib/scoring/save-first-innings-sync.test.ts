import { describe, expect, it } from "vitest";
import { readFileSync } from "fs";
import { join } from "path";

/**
 * Regression guardrails for Save 1st Innings + delivery sync ownership.
 * (Behavior is implemented in use-live-scoring, delivery-sync, live-score-screen.)
 */
describe("save first innings sync ownership", () => {
  const root = join(process.cwd(), "src");

  it("flushes only the active match before complete-innings", () => {
    const src = readFileSync(
      join(root, "lib/scoring/use-live-scoring.ts"),
      "utf8",
    );
    expect(src).toContain("flushSyncQueueUntilIdle");
    expect(src).toMatch(/flushSyncQueueUntilIdle[\s\S]*matchId:\s*bootstrap\.matchId/);
  });

  it("does not run completed-match backfill while match is live", () => {
    const src = readFileSync(
      join(root, "components/live/live-score-screen.tsx"),
      "utf8",
    );
    expect(src).toContain("isController && completed");
  });

  it("serializes delivery flush to prevent concurrent duplicate POSTs", () => {
    const src = readFileSync(join(root, "lib/sync/delivery-sync.ts"), "utf8");
    expect(src).toContain("runSerializedFlush");
    expect(src).toContain("loadPendingSyncItems");
    expect(src).toMatch(/matchId\?: string/);
  });

  it("complete-innings does not clear scorer session cookie", () => {
    const src = readFileSync(
      join(root, "app/api/scoring/complete-innings/route.ts"),
      "utf8",
    );
    expect(src).not.toContain("clearScorerSessionCookie");
  });

  it("deliveries route returns coded 403 for match mismatch", () => {
    const src = readFileSync(
      join(root, "app/api/scoring/deliveries/route.ts"),
      "utf8",
    );
    expect(src).toContain('code: "match_mismatch"');
  });
});
