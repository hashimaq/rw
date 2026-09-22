import type { RedWingsInnings } from "@/lib/match/match-setup-plan";
import {
  matchMetadataFromSetup,
  type RedWingsRole,
} from "@/lib/match/match-setup-plan";

export type { RedWingsInnings } from "@/lib/match/match-setup-plan";

/** @deprecated Use matchMetadataFromSetup(role, innings). Assumes Red Wings batting in selected innings. */
export function matchMetadataFromRedWingsInnings(rwInnings: RedWingsInnings): ReturnType<
  typeof matchMetadataFromSetup
> {
  const role: RedWingsRole = rwInnings === 1 ? "batting" : "batting";
  return matchMetadataFromSetup(role, rwInnings);
}

export function redWingsInningsLabel(rwInnings: RedWingsInnings): string {
  return rwInnings === 1 ? "First Innings" : "Second Innings";
}
