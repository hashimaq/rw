/**
 * Provisions Supabase Auth admins + public.profiles (service-role, server-side only).
 *
 * - Supabase keys: .env / .env.local
 * - Admin passwords: scripts/admin-provision.local.json (gitignored)
 *
 * Usage: npm run supabase:provision-admins
 */

import { createClient } from "@supabase/supabase-js";
import {
  loadAdminAccountsFromLocalFile,
  loadEnvFile,
  REQUIRED_ADMIN_EMAILS,
} from "./admin-env.mjs";

loadEnvFile();

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !serviceKey) {
  console.error(
    "Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env / .env.local",
  );
  process.exit(1);
}

const admins = loadAdminAccountsFromLocalFile();

const supabase = createClient(url, serviceKey, {
  auth: { persistSession: false, autoRefreshToken: false },
});

async function findUserByEmail(email) {
  let page = 1;
  const perPage = 200;
  while (true) {
    const { data, error } = await supabase.auth.admin.listUsers({
      page,
      perPage,
    });
    if (error) throw error;
    const found = data.users.find(
      (u) => u.email?.toLowerCase() === email.toLowerCase(),
    );
    if (found) return found;
    if (data.users.length < perPage) return null;
    page += 1;
  }
}

async function ensureAdmin({ email, password, full_name }) {
  let user = await findUserByEmail(email);

  if (!user) {
    const { data, error } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { full_name },
    });
    if (error) throw new Error(`${email}: createUser — ${error.message}`);
    user = data.user;
    console.log(`Created Auth user: ${email}`);
  } else {
    const { error } = await supabase.auth.admin.updateUserById(user.id, {
      password,
      email_confirm: true,
      user_metadata: { ...user.user_metadata, full_name },
    });
    if (error) throw new Error(`${email}: updateUser — ${error.message}`);
    console.log(`Updated existing Auth user: ${email}`);
  }

  const role =
    email.toLowerCase() === "hashim@redwings.com" ? "super_admin" : "admin";

  const { error: profileError } = await supabase.from("profiles").upsert(
    {
      id: user.id,
      full_name,
      role,
      is_active: true,
    },
    { onConflict: "id" },
  );

  if (profileError) {
    throw new Error(`${email}: profiles upsert — ${profileError.message}`);
  }

  console.log(`Profile ${role} active: ${full_name} (${user.id})`);
  return user.id;
}

async function verifySignIn(email, password) {
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!anonKey) {
    console.warn("Skip sign-in verify: no NEXT_PUBLIC_SUPABASE_ANON_KEY");
    return false;
  }
  const anon = createClient(url, anonKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data, error } = await anon.auth.signInWithPassword({
    email,
    password,
  });
  if (error) return false;
  await anon.auth.signOut();
  return Boolean(data.user);
}

async function main() {
  console.log("Provisioning admins (Auth user → profiles.role=admin)...\n");

  const ids = [];
  for (const admin of admins) {
    ids.push(await ensureAdmin(admin));
  }

  console.log("\nSign-in check (anon key)...");
  for (const admin of admins) {
    const ok = await verifySignIn(admin.email, admin.password);
    console.log(`  ${admin.email}: ${ok ? "OK" : "FAILED"}`);
    if (!ok) process.exitCode = 1;
  }

  console.log("\nProfile check (service role)...");
  const { data: profiles, error } = await supabase
    .from("profiles")
    .select("id, full_name, role, is_active")
    .in("id", ids);

  if (error) {
    console.error(error.message);
    process.exit(1);
  }

  for (const admin of admins) {
    const user = await findUserByEmail(admin.email);
    if (!user) {
      console.log(`  ${admin.email}: Auth user MISSING`);
      process.exitCode = 1;
      continue;
    }
    const p = profiles?.find((row) => row.id === user.id);
    const ok = p?.role === "admin" && p?.is_active === true;
    console.log(
      `  ${admin.email}: auth=OK profile role=${p?.role ?? "none"} active=${p?.is_active ?? false} ${ok ? "OK" : "FAILED"}`,
    );
    if (!ok) process.exitCode = 1;
  }

  console.log("\nDone.");
}

main().catch((e) => {
  console.error(e.message ?? e);
  process.exit(1);
});
