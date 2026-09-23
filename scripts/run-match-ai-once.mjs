import { readFileSync, existsSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath, pathToFileURL } from "url";
import { createRequire } from "module";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const slug = process.argv[2] ?? "3249f7b9d4";

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

const require = createRequire(import.meta.url);
// Stub server-only for Node script execution
require.cache[require.resolve("server-only")] = {
  id: "server-only",
  filename: "server-only",
  loaded: true,
  exports: {},
};

async function main() {
  const { createClient } = await import("@supabase/supabase-js");
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
  );
  const { data: match } = await supabase
    .from("matches")
    .select("id")
    .eq("share_slug", slug)
    .maybeSingle();
  if (!match) {
    console.error("match not found");
    process.exit(1);
  }

  const runPath = pathToFileURL(
    resolve(root, "src/lib/ai/run-match-ai-analysis.ts"),
  ).href;
  const { runMatchAiAnalysis } = await import(runPath);
  await runMatchAiAnalysis(match.id);
  console.log("runMatchAiAnalysis finished for", match.id);
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
