import "server-only";

import { cache } from "react";
import { createServiceRoleClient } from "@/lib/supabase/admin";

/** Lightweight title lookup — do not load full scorecard in `generateMetadata`. */
export const getMatchScorecardPageTitle = cache(
  async (shareSlug: string): Promise<string | null> => {
    const supabase = createServiceRoleClient();
    const { data } = await supabase
      .from("matches")
      .select("match_number")
      .eq("share_slug", shareSlug)
      .maybeSingle();
    return data?.match_number ?? null;
  },
);
