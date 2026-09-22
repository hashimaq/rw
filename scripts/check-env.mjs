import { existsSync, readFileSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
for (const f of [".env.local", ".env"]) {
  const p = resolve(root, f);
  if (!existsSync(p)) continue;
  const t = readFileSync(p, "utf8");
  const g = (k) => {
    const line = t.split("\n").find((l) => l.startsWith(k + "="));
    if (!line) return "";
    return line.slice(k.length + 1).trim().replace(/^["']|["']$/g, "");
  };
  console.log("env_file", f);
  console.log("has_url", Boolean(g("NEXT_PUBLIC_SUPABASE_URL")));
  console.log("has_anon", Boolean(g("NEXT_PUBLIC_SUPABASE_ANON_KEY")));
  console.log("has_service", Boolean(g("SUPABASE_SERVICE_ROLE_KEY")));
  console.log("has_db_url", Boolean(g("DATABASE_URL") || g("SUPABASE_DB_URL")));
  const u = g("NEXT_PUBLIC_SUPABASE_URL");
  if (u) console.log("project_ref", new URL(u).hostname.split(".")[0]);
  process.exit(0);
}
console.log("no_env");
process.exit(1);
