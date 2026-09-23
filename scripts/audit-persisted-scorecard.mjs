/**
 * Read-only audit for match slug — delivery dump + engine vs scorecard figures.
 * Usage: node scripts/audit-persisted-scorecard.mjs b0cdc08b2e
 *
 * Requires: npx tsx (devDependency via vitest/node — use node with dynamic import)
 */
import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "fs";
import { dirname, join } from "path";
import { fileURLToPath } from "url";

const slug = process.argv[2] ?? "b0cdc08b2e";
const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const envText = readFileSync(join(root, ".env"), "utf8");
const env = {};
for (const line of envText.split("\n")) {
  const t = line.trim();
  if (!t || t.startsWith("#")) continue;
  const i = t.indexOf("=");
  if (i === -1) continue;
  env[t.slice(0, i).trim()] = t.slice(i + 1).trim();
}

const supabase = createClient(
  env.NEXT_PUBLIC_SUPABASE_URL,
  env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { persistSession: false } },
);

const { data: match } = await supabase
  .from("matches")
  .select("*")
  .eq("share_slug", slug)
  .maybeSingle();
if (!match) {
  console.error("match not found");
  process.exit(1);
}

const { data: innings } = await supabase
  .from("innings")
  .select("*")
  .eq("match_id", match.id)
  .order("innings_number");

const inningsIds = (innings ?? []).map((i) => i.id);
const { data: deliveryRows } = await supabase
  .from("deliveries")
  .select("*")
  .in("innings_id", inningsIds)
  .order("sequence_in_innings");

const { data: squadRows } = await supabase
  .from("match_squads")
  .select(
    "player_id, squad_status, is_captain, is_wicketkeeper, batting_position, created_at",
  )
  .eq("match_id", match.id);

const playerIds = [...new Set((squadRows ?? []).map((r) => r.player_id))];
const { data: players } = await supabase
  .from("players")
  .select("id, full_name, jersey_number, is_official_squad")
  .in("id", playerIds.length ? playerIds : ["00000000-0000-0000-0000-000000000000"]);

const playerMap = new Map((players ?? []).map((p) => [p.id, p]));
const squad = (squadRows ?? [])
  .map((row, index) => {
    const meta = playerMap.get(row.player_id);
    if (!meta) return null;
    return {
      playerId: row.player_id,
      fullName: meta.full_name,
      jerseyNumber: meta.jersey_number,
      isCaptain: row.is_captain,
      isWicketkeeper: row.is_wicketkeeper,
      squadStatus: row.squad_status,
      isGuest: meta.is_official_squad === false,
      battingPosition: row.batting_position,
      squadOrder: index,
    };
  })
  .filter(Boolean);

// Dynamic import TS audit module via tsx subprocess output JSON
import { execSync } from "child_process";
const payload = JSON.stringify({
  match,
  innings: innings ?? [],
  deliveryRows: deliveryRows ?? [],
  squad,
});

import { writeFileSync, unlinkSync } from "fs";
const tmp = join(root, "scripts", ".audit-run.tmp.mjs");
writeFileSync(
  tmp,
  `
import { buildAuditReport } from "../src/lib/scorecard/persisted-match-audit.ts";
const input = ${payload};
console.log(JSON.stringify(buildAuditReport({
  match: input.match,
  innings: input.innings,
  deliveryRows: input.deliveryRows,
  squad: input.squad,
  seriesName: null,
  tournamentName: null,
}), null, 2));
`,
);

try {
  const out = execSync(`npx tsx "${tmp}"`, {
    cwd: root,
    encoding: "utf8",
    maxBuffer: 10 * 1024 * 1024,
  });
  console.log(out);
} catch (e) {
  console.error("tsx audit failed:", e.stderr ?? e.message);
  process.exit(1);
} finally {
  try {
    unlinkSync(tmp);
  } catch {
    /* ignore */
  }
}
