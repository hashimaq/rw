const SENSITIVE_KEYS = new Set([
  "password",
  "password_hash",
  "scorer_pin",
  "scorer_pin_hash",
  "session_token",
  "session_token_hash",
  "token",
  "access_token",
  "refresh_token",
  "service_role",
  "secret",
]);

function sanitizeValue(value: unknown): unknown {
  if (value === null || value === undefined) return value;
  if (Array.isArray(value)) {
    return value.map(sanitizeValue);
  }
  if (typeof value === "object") {
    return sanitizeAuditPayload(value as Record<string, unknown>);
  }
  return value;
}

export function sanitizeAuditPayload(
  payload: Record<string, unknown> | null | undefined,
): Record<string, unknown> | null {
  if (!payload) return null;
  const out: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(payload)) {
    const lower = key.toLowerCase();
    if (SENSITIVE_KEYS.has(lower) || lower.includes("pin") || lower.includes("token")) {
      continue;
    }
    out[key] = sanitizeValue(value);
  }
  return Object.keys(out).length > 0 ? out : null;
}
