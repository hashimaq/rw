import { describe, expect, it } from "vitest";
import { isAuditEnumMissingError } from "@/lib/admin/match-delete";

describe("admin match delete", () => {
  it("detects missing MATCH_DELETED audit enum errors", () => {
    expect(
      isAuditEnumMissingError(
        'invalid input value for enum admin_audit_action: "MATCH_DELETED"',
      ),
    ).toBe(true);
    expect(
      isAuditEnumMissingError(
        'invalid input value for enum admin_audit_action: "MATCH_DELETED_BY_SCORER"',
      ),
    ).toBe(true);
    expect(isAuditEnumMissingError("something else")).toBe(false);
  });
});
