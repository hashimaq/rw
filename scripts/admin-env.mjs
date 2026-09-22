import { readFileSync, existsSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

const scriptsDir = dirname(fileURLToPath(import.meta.url));
const root = resolve(scriptsDir, "..");

/** Must match admin-provision.local.example.json (emails are not secrets). */
export const REQUIRED_ADMIN_EMAILS = [
  "hashim@redwings.com",
  "ar@redwings.com",
  "mujahid@redwings.com",
];

export function loadEnvFile() {
  for (const f of [".env.local", ".env"]) {
    const p = resolve(root, f);
    if (!existsSync(p)) continue;
    const text = readFileSync(p, "utf8");
    for (const line of text.split("\n")) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) continue;
      const eq = trimmed.indexOf("=");
      if (eq === -1) continue;
      const key = trimmed.slice(0, eq).trim();
      let val = trimmed.slice(eq + 1).trim();
      if (
        (val.startsWith('"') && val.endsWith('"')) ||
        (val.startsWith("'") && val.endsWith("'"))
      ) {
        val = val.slice(1, -1);
      }
      if (process.env[key] === undefined) process.env[key] = val;
    }
  }
}

/**
 * Admin passwords live only in gitignored scripts/admin-provision.local.json.
 * Supabase URL + service role key come from .env / .env.local.
 */
export function loadAdminAccountsFromLocalFile() {
  const configPath = resolve(scriptsDir, "admin-provision.local.json");
  if (!existsSync(configPath)) {
    throw new Error(
      "Missing scripts/admin-provision.local.json (gitignored). Copy admin-provision.local.example.json and fill passwords locally.",
    );
  }

  /** @type {{ admins?: { email: string; password: string; full_name: string }[] }} */
  const parsed = JSON.parse(readFileSync(configPath, "utf8"));
  const admins = parsed.admins ?? [];

  if (admins.length !== REQUIRED_ADMIN_EMAILS.length) {
    throw new Error(
      `admin-provision.local.json must define exactly ${REQUIRED_ADMIN_EMAILS.length} admins.`,
    );
  }

  for (const required of REQUIRED_ADMIN_EMAILS) {
    const row = admins.find(
      (a) => a.email?.toLowerCase() === required.toLowerCase(),
    );
    if (!row?.password || !row.full_name) {
      throw new Error(
        `admin-provision.local.json missing entry or password for ${required}`,
      );
    }
  }

  return REQUIRED_ADMIN_EMAILS.map((email) => {
    const row = admins.find(
      (a) => a.email.toLowerCase() === email.toLowerCase(),
    );
    return {
      email: row.email,
      password: row.password,
      full_name: row.full_name,
    };
  });
}
