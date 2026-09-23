/**
 * One-off DB + builder diagnostic for a share_slug. Does not print secrets.
 * Usage: node scripts/diagnose-scorecard.mjs b0cdc08b2e
 */
import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "fs";
import { dirname, join } from "path";
import { fileURLToPath } from "url";

const slug = process.argv[2];
if (!slug) {
  console.error("Usage: node scripts/diagnose-scorecard.mjs <share_slug>");
  process.exit(1);
}

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

const url = env.NEXT_PUBLIC_SUPABASE_URL;
const key = env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env");
  process.exit(1);
}

const supabase = createClient(url, key, {
  auth: { persistSession: false, autoRefreshToken: false },
});

async function main() {
  const { data: match, error: matchErr } = await supabase
    .from("matches")
    .select(
      "id, share_slug, status, result, winner, win_margin, win_margin_type, opponent_name, is_public_scorecard, is_public_live, completed_at",
    )
    .eq("share_slug", slug)
    .maybeSingle();

  console.log("=== MATCH ===");
  if (matchErr) {
    console.log("error:", matchErr.message, matchErr.code);
    return;
  }
  if (!match) {
    console.log("not found for share_slug:", slug);
    return;
  }
  console.log(JSON.stringify(match, null, 2));

  const { data: innings, error: innErr } = await supabase
    .from("innings")
    .select("*")
    .eq("match_id", match.id)
    .order("innings_number", { ascending: true });

  console.log("\n=== INNINGS ===");
  if (innErr) console.log("error:", innErr.message);
  else {
    console.log("count:", innings?.length ?? 0);
    for (const inn of innings ?? []) {
      console.log({
        id: inn.id,
        n: inn.innings_number,
        batting: inn.batting_team,
        bowling: inn.bowling_team,
        status: inn.innings_status,
        total_runs: inn.total_runs,
        wickets: inn.wickets,
      });
    }
  }

  const inningsIds = (innings ?? []).map((i) => i.id);

  const { data: squad, error: squadErr, count: squadCount } = await supabase
    .from("match_squads")
    .select("player_id, squad_status, batting_position", { count: "exact" })
    .eq("match_id", match.id);

  console.log("\n=== SQUAD ===");
  if (squadErr) console.log("error:", squadErr.message);
  else {
    console.log("count:", squadCount ?? squad?.length ?? 0);
    console.log(
      "playing_xi:",
      (squad ?? []).filter((s) => s.squad_status === "playing_xi").length,
    );
  }

  let deliveries = [];
  if (inningsIds.length) {
    const { data: del, error: delErr, count: delCount } = await supabase
      .from("deliveries")
      .select(
        "id, innings_id, sequence_in_innings, striker_player_id, striker_name, bowler_player_id, bowler_name, total_runs, is_legal_delivery, is_wicket",
        { count: "exact" },
      )
      .in("innings_id", inningsIds)
      .order("sequence_in_innings", { ascending: true });

    console.log("\n=== DELIVERIES ===");
    if (delErr) console.log("error:", delErr.message, delErr.code);
    else {
      deliveries = del ?? [];
      console.log("total count:", delCount ?? deliveries.length);
      for (const innId of inningsIds) {
        const rows = deliveries.filter((d) => d.innings_id === innId);
        const legal = rows.filter((d) => d.is_legal_delivery).length;
        const runs = rows.reduce((s, d) => s + (d.total_runs ?? 0), 0);
        const wkts = rows.filter((d) => d.is_wicket).length;
        const batters = new Set(
          rows.flatMap((d) => [d.striker_player_id, d.striker_name].filter(Boolean)),
        );
        const bowlers = new Set(
          rows.flatMap((d) => [d.bowler_player_id, d.bowler_name].filter(Boolean)),
        );
        console.log({
          innings_id: innId,
          deliveries: rows.length,
          legal,
          sum_total_runs: runs,
          wicket_flags: wkts,
          first_seq: rows[0]?.sequence_in_innings,
          last_seq: rows.at(-1)?.sequence_in_innings,
          distinct_striker_ids: [
            ...new Set(rows.map((d) => d.striker_player_id).filter(Boolean)),
          ].length,
          distinct_bowler_ids: [
            ...new Set(rows.map((d) => d.bowler_player_id).filter(Boolean)),
          ].length,
        });
      }
      if (deliveries.length) {
        console.log("first:", deliveries[0]);
        console.log("last:", deliveries.at(-1));
      }
    }
  }

  const playerIds = new Set((squad ?? []).map((s) => s.player_id));
  for (const d of deliveries) {
    if (d.striker_player_id) playerIds.add(d.striker_player_id);
    if (d.bowler_player_id) playerIds.add(d.bowler_player_id);
  }

  const ids = [...playerIds];
  let players = [];
  if (ids.length) {
    const { data: pl, error: plErr } = await supabase
      .from("players")
      .select("id, full_name")
      .in("id", ids);
    console.log("\n=== PLAYERS (batched) ===");
    if (plErr) console.log("error:", plErr.message);
    else {
      players = pl ?? [];
      console.log("requested:", ids.length, "returned:", players.length);
      const found = new Set(players.map((p) => p.id));
      const missing = ids.filter((id) => !found.has(id));
      if (missing.length) console.log("missing ids:", missing);
    }
  }

  // Anon client read (RLS) — same as old public path might have used
  const anonKey = env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (anonKey && inningsIds.length) {
    const anon = createClient(url, anonKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
    const { data: anonDel, error: anonErr, count: anonCount } = await anon
      .from("deliveries")
      .select("id", { count: "exact", head: true })
      .in("innings_id", inningsIds);
    console.log("\n=== ANON DELIVERIES READ (RLS) ===");
    if (anonErr) console.log("error:", anonErr.message, anonErr.code);
    else console.log("count:", anonCount);
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
