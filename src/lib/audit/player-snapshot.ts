import type { Player } from "@/lib/database/types";

export function playerAuditSnapshot(player: Player) {
  return {
    id: player.id,
    full_name: player.full_name,
    jersey_number: player.jersey_number,
    role: player.role,
    batting_style: player.batting_style,
    bowling_style: player.bowling_style,
    is_active: player.is_active,
  };
}

export function playerAuditDiff(
  before: Player,
  after: Player,
): { previous: Record<string, unknown>; next: Record<string, unknown> } {
  const prev: Record<string, unknown> = {};
  const next: Record<string, unknown> = {};
  const keys = [
    "full_name",
    "jersey_number",
    "role",
    "batting_style",
    "bowling_style",
    "is_active",
  ] as const;

  for (const key of keys) {
    if (before[key] !== after[key]) {
      prev[key] = before[key];
      next[key] = after[key];
    }
  }
  return { previous: prev, next };
}
