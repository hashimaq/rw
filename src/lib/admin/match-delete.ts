/** Server-side helpers for admin match deletion. */

export function isAuditEnumMissingError(message: string): boolean {
  const m = message.toLowerCase();
  return (
    m.includes("match_deleted_by_scorer") ||
    m.includes("match_deleted") ||
    m.includes("invalid input value for enum") ||
    m.includes("admin_audit_action")
  );
}
