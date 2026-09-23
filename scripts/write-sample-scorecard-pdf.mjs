import { readFileSync, existsSync, writeFileSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath, pathToFileURL } from "url";
import { createRequire } from "module";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const slug = process.argv[2] ?? "3249f7b9d4";
const out = resolve(root, "tmp-scorecard-verify.pdf");

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

async function main() {
  const loadPath = pathToFileURL(
    resolve(root, "src/lib/data/match-scorecard.ts"),
  ).href;
  const pdfPath = pathToFileURL(
    resolve(root, "src/lib/scorecard/generate-scorecard-pdf.ts"),
  ).href;
  const layoutPath = pathToFileURL(
    resolve(root, "src/lib/scorecard/scorecard-pdf-layout.ts"),
  ).href;

  const { loadMatchScorecardPage } = await import(loadPath);
  const { generateScorecardPdfBuffer } = await import(pdfPath);
  const { getLastComposedPdfPageCount } = await import(layoutPath);

  const result = await loadMatchScorecardPage(slug, true);
  if (result.status !== "ok") {
    console.error("scorecard load", result.status);
    process.exit(1);
  }
  const buf = await generateScorecardPdfBuffer(result.data);
  writeFileSync(out, buf);
  console.log(
    JSON.stringify({
      path: out,
      bytes: buf.length,
      composed_pages: getLastComposedPdfPageCount(),
    }),
  );
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
