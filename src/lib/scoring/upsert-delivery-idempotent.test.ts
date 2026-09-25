import { describe, expect, it } from "vitest";
import { isInningsSequenceUniqueViolation } from "@/lib/scoring/upsert-delivery-idempotent";

describe("isInningsSequenceUniqueViolation", () => {
  it("detects innings sequence unique violations", () => {
    expect(
      isInningsSequenceUniqueViolation({
        code: "23505",
        message:
          'duplicate key value violates unique constraint "deliveries_innings_sequence_unique"',
      }),
    ).toBe(true);
  });

  it("ignores other postgres errors", () => {
    expect(
      isInningsSequenceUniqueViolation({
        code: "23505",
        message: "duplicate key value violates unique constraint \"deliveries_pkey\"",
      }),
    ).toBe(false);
  });
});
