import { revalidatePath, revalidateTag } from "next/cache";
import type { MatchDeleteSnapshot } from "@/lib/repositories/matches.repository";
import { CACHE_TAGS } from "@/lib/cache/tags";

export function revalidateAfterMatchDelete(snapshot: MatchDeleteSnapshot): void {
  revalidateTag(CACHE_TAGS.matches, "max");
  revalidateTag(CACHE_TAGS.completedScorecards, "max");
  revalidateTag(CACHE_TAGS.adminAudit, "max");
  revalidateTag(CACHE_TAGS.players, "max");
  revalidatePath("/admin");
  revalidatePath("/live");
  revalidatePath("/matches");
  revalidatePath("/start-scoring");
  if (snapshot.share_slug) {
    revalidatePath(`/live/${snapshot.share_slug}`);
    revalidatePath(`/live/${snapshot.share_slug}/score`);
    revalidatePath(`/live/${snapshot.share_slug}/enter-pin`);
    revalidatePath(`/match/${snapshot.share_slug}`);
  }
}
