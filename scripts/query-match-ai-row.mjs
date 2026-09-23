import { createClient } from "@supabase/supabase-js";
import { readFileSync, existsSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const slug = process.argv[2] || "3249f7b9d4";

function loadEnv() {
  for (const f of [".env.local", ".env"]) {
    const p = resolve(root, f);
    if (!existsSync(p)) continue;
    for (const line of readFileSync(p, "utf8").split("\n")) {
      const t = line.trim();
      if (!t || t.startsWith("#")) continue;
      const i = t.indexOf("=");
      if (i <= 0) continue;
      const k = t.slice(0, i).trim();
      let v = t.slice(i + 1).trim();
      if (
        (v.startsWith('"') && v.endsWith('"')) ||
        (v.startsWith("'") && v.endsWith("'"))
      ) {
        v = v.slice(1, -1);
      }
      if (!process.env[k]) process.env[k] = v;
    }
    break;
  }
}

loadEnv();

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) {
  console.error("missing supabase env");
  process.exit(1);
}

const supabase = createClient(url, key);

const { data: match, error: matchErr } = await supabase
  .from("matches")
  .select("id, share_slug, status, player_of_match_id, opponent_name")
  .eq("share_slug", slug)
  .maybeSingle();

if (matchErr || !match) {
  console.error("match not found", matchErr?.message);
  process.exit(1);
}

const { data: aiRow } = await supabase
  .from("match_ai_analysis")
  .select(
    "status, error_message, player_of_match_id, generated_at, updated_at, model_version, generated_analysis",
  )
  .eq("match_id", match.id)
  .maybeSingle();

let summaryCount = null;
let momKey = null;
if (aiRow?.generated_analysis) {
  const ga = aiRow.generated_analysis;
  summaryCount = Array.isArray(ga.player_summaries)
    ? ga.player_summaries.length
    : null;
  momKey = ga.man_of_the_match?.participant_key ?? null;
}

console.log(
  JSON.stringify(
    {
      match_id: match.id,
      share_slug: match.share_slug,
      match_status: match.status,
      matches_player_of_match_id: match.player_of_match_id,
      ai: aiRow
        ? {
            status: aiRow.status,
            error_message: aiRow.error_message,
            player_of_match_id: aiRow.player_of_match_id,
            generated_at: aiRow.generated_at,
            updated_at: aiRow.updated_at,
            model_version: aiRow.model_version,
            participant_summary_count: summaryCount,
            mom_participant_key: momKey,
          }
        : null,
    },
    null,
    2,
  ),
);
