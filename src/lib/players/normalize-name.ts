/** Collapse whitespace and lowercase for duplicate comparison. */
export function normalizePlayerName(name: string): string {
  return name.trim().replace(/\s+/g, " ").toLowerCase();
}

export function findSimilarPlayerNames(
  name: string,
  existing: Array<{ id: string; full_name: string }>,
  excludeId?: string,
): Array<{ id: string; full_name: string }> {
  const target = normalizePlayerName(name);
  if (!target) return [];

  return existing.filter((p) => {
    if (excludeId && p.id === excludeId) return false;
    const normalized = normalizePlayerName(p.full_name);
    if (normalized === target) return true;
    if (normalized.replace(/\s/g, "") === target.replace(/\s/g, "")) return true;
    return false;
  });
}
