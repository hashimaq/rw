import { readFileSync, existsSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");

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

const apiKey = process.env.GEMINI_API_KEY?.trim();
const model =
  process.env.GEMINI_MATCH_ANALYSIS_MODEL?.trim() || "gemini-3.5-flash-lite";

if (!apiKey) {
  console.log(JSON.stringify({ ok: false, reason: "missing_api_key" }));
  process.exit(1);
}

const url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`;

const body = {
  contents: [{ role: "user", parts: [{ text: '{"ping":true}' }] }],
  generationConfig: {
    temperature: 0.2,
    responseMimeType: "application/json",
    responseSchema: {
      type: "object",
      properties: { ok: { type: "boolean" } },
      required: ["ok"],
    },
  },
};

const res = await fetch(url, {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
    "X-goog-api-key": apiKey,
  },
  body: JSON.stringify(body),
});

const text = await res.text();
let json = null;
try {
  json = JSON.parse(text);
} catch {
  json = { raw: text.slice(0, 500) };
}

console.log(
  JSON.stringify(
    {
      model,
      http_status: res.status,
      ok: res.ok,
      error_message: json?.error?.message ?? null,
      error_status: json?.error?.status ?? null,
      candidate_text: json?.candidates?.[0]?.content?.parts?.[0]?.text?.slice(
        0,
        200,
      ),
    },
    null,
    2,
  ),
);
