import { describe, expect, it } from "vitest";
import { readFileSync } from "fs";
import { join } from "path";
import { deliveryInputSchema } from "@/lib/validation/delivery";

const root = join(process.cwd(), "src");

describe("production hardening — delivery lifecycle invariants", () => {
  it("requires stable client_event_id on delivery payloads", () => {
    const parsed = deliveryInputSchema.safeParse({
      client_event_id: "11111111-1111-4111-8111-111111111111",
      innings_id: "22222222-2222-4222-8222-222222222222",
      sequence_in_innings: 1,
      over_number: 0,
      ball_number: 1,
      striker_name: "A",
      non_striker_name: "B",
      bowler_name: "C",
      batter_runs: 1,
      total_runs: 1,
      extras_runs: 0,
      extra_type: "none",
      is_legal_delivery: true,
      is_boundary: false,
      is_six: false,
      is_wicket: false,
      wicket_type: null,
    });
    expect(parsed.success).toBe(true);
  });

  it("marks deliveries synced only after successful push in flush", () => {
    const src = readFileSync(join(root, "lib/sync/delivery-sync.ts"), "utf8");
    expect(src).toMatch(/await push\(item\.payload\)[\s\S]*status: "synced"/);
    expect(src).not.toMatch(/status: "synced"[\s\S]*await push/);
  });

  it("dedupes local writes by client_event_id", () => {
    const src = readFileSync(join(root, "lib/sync/delivery-sync.ts"), "utf8");
    expect(src).toContain('.equals(payload.client_event_id)');
    expect(src).toContain("if (existing) return");
  });

  it("applies engine update before local persist in live scoring", () => {
    const src = readFileSync(join(root, "lib/scoring/use-live-scoring.ts"), "utf8");
    expect(src).toContain("persistDeliveryInBackground");
    expect(src).toMatch(/commitParticipantsMeta[\s\S]*persistDeliveryInBackground/);
  });

  it("server skips consecutive-over validation for crease correction sync", () => {
    const src = readFileSync(
      join(root, "lib/scoring/validate-incoming-delivery.ts"),
      "utf8",
    );
    expect(src).toContain("deliveryRequiresConsecutiveOverCheck");
  });

  it("schedules controller commentary before waiting on delivery sync", () => {
    const src = readFileSync(join(root, "lib/scoring/use-live-scoring.ts"), "utf8");
    expect(src).toContain("startControllerCommentaryFastPath");
    expect(src).toMatch(
      /startControllerCommentaryFastPath[\s\S]*recordDeliveryLocalFirst/,
    );
  });
});

describe("production hardening — match completion session", () => {
  it("does not end scoring sessions when match completes", () => {
    const src = readFileSync(join(root, "lib/scoring/finalize-match.ts"), "utf8");
    expect(src).toContain("Scoring sessions stay active");
    expect(src).not.toContain("ended_at");
  });
});

describe("production hardening — undo local-first", () => {
  it("removes local delivery and queue row on undo", () => {
    const src = readFileSync(join(root, "lib/sync/undo-delivery.ts"), "utf8");
    expect(src).toContain("undoDeliveryLocal");
    expect(src).toMatch(/deliveries[\s\S]*delete\(\)/);
    expect(src).toMatch(/syncQueue[\s\S]*delete\(\)/);
  });
});
