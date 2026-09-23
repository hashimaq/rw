/**
 * Read-only diagnosis: one RPC call with a non-existent striker_player_id
 * must fail (no row persisted on FK violation).
 */
import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "fs";
import { dirname, join } from "path";
import { fileURLToPath } from "url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const env = Object.fromEntries(
  readFileSync(join(root, ".env"), "utf8")
    .split("\n")
    .filter((l) => l.includes("="))
    .map((l) => {
      const i = l.indexOf("=");
      return [l.slice(0, i).trim(), l.slice(i + 1).trim()];
    }),
);

const supabase = createClient(
  env.NEXT_PUBLIC_SUPABASE_URL,
  env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { persistSession: false } },
);

const inn1 = "4b9bbe82-6af1-4e10-84b9-59ade8ad52d2";
const fakeStriker = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";

const { data, error } = await supabase.rpc("upsert_delivery_idempotent", {
  p_client_event_id: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb",
  p_innings_id: inn1,
  p_sequence_in_innings: 99999,
  p_over_number: 0,
  p_ball_number: 1,
  p_striker_player_id: fakeStriker,
  p_striker_name: "Probe Opp",
  p_non_striker_player_id: null,
  p_non_striker_name: "Other",
  p_bowler_player_id: null,
  p_bowler_name: "Bowl",
  p_batter_runs: 0,
  p_total_runs: 0,
  p_extras_runs: 0,
  p_extra_type: "none",
  p_is_legal_delivery: true,
  p_is_boundary: false,
  p_is_six: false,
  p_is_wicket: false,
  p_wicket_type: null,
  p_dismissed_player_id: null,
  p_dismissed_player_name: null,
  p_fielder_player_id: null,
  p_fielder_name: null,
  p_notes: null,
});

console.log("rpc data:", data);
console.log("rpc error:", error?.code, error?.message);

const { count } = await supabase
  .from("deliveries")
  .select("id", { count: "exact", head: true })
  .eq("client_event_id", "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb");
console.log("rows with probe client_event_id (expect 0):", count);
