import { readFileSync, existsSync, writeFileSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";
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
require.cache[require.resolve("server-only")] = {
  id: "server-only",
  filename: "server-only",
  loaded: true,
  exports: {},
};

const { loadMatchScorecardPage } = await import(
  "../src/lib/data/match-scorecard.ts"
);
const { generateScorecardPdfBuffer } = await import(
  "../src/lib/scorecard/generate-scorecard-pdf.ts"
);
const { getLastComposedPdfPageCount } = await import(
  "../src/lib/scorecard/scorecard-pdf-layout.ts"
);

const result = await loadMatchScorecardPage(slug, null);
if (result.status !== "ok") {
  console.error("load failed", result);
  process.exit(1);
}

const buf = await generateScorecardPdfBuffer(result.data);
const s = buf.toString("latin1");
const pdfkitPages = (s.match(/\/Type\s*\/Page\b/g) || []).length;
const out = resolve(root, "tmp-scorecard-verify.pdf");
writeFileSync(out, buf);

console.log(
  JSON.stringify(
    {
      slug,
      composed_pages: getLastComposedPdfPageCount(),
      pdfkit_page_objects: pdfkitPages,
      bytes: buf.length,
      ai_state: result.data.aiAnalysis?.state ?? null,
      performance_count:
        result.data.aiAnalysis?.state === "ready"
          ? result.data.aiAnalysis.playerPerformances.length
          : 0,
    },
    null,
    2,
  ),
);
