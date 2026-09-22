/**
 * Verify all three admin accounts: Auth sign-in + profiles.role = admin.
 * Passwords: scripts/admin-provision.local.json only.
 */

import { createClient } from "@supabase/supabase-js";
import {
  loadAdminAccountsFromLocalFile,
  loadEnvFile,
  REQUIRED_ADMIN_EMAILS,
} from "./admin-env.mjs";

loadEnvFile();

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !anonKey) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY");
  process.exit(1);
}

const admins = loadAdminAccountsFromLocalFile();

const service = serviceKey
  ? createClient(url, serviceKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    })
  : null;

async function findUserByEmail(email) {
  if (!service) return null;
  let page = 1;
  const perPage = 200;
  while (true) {
    const { data, error } = await service.auth.admin.listUsers({
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

async function main() {
  let failed = false;

  console.log(`Verifying ${REQUIRED_ADMIN_EMAILS.length} admin accounts...\n`);

  for (const admin of admins) {
    const authUser = await findUserByEmail(admin.email);
    if (!authUser) {
      console.log(`${admin.email}: Auth user MISSING`);
      failed = true;
      continue;
    }

    const client = createClient(url, anonKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    const { data: signIn, error: signInError } =
      await client.auth.signInWithPassword({
        email: admin.email,
        password: admin.password,
      });

    if (signInError || !signIn.user) {
      console.log(`${admin.email}: sign-in FAILED (auth user exists)`);
      failed = true;
      continue;
    }

    const { data: profile, error: profileError } = await client
      .from("profiles")
      .select("role, is_active, full_name")
      .eq("id", signIn.user.id)
      .maybeSingle();

    const adminOk =
      !profileError &&
      profile?.role === "admin" &&
      profile?.is_active === true;

    console.log(
      `${admin.email}: auth=OK sign-in=OK profile admin=${adminOk ? "OK" : "FAILED"}`,
    );
    if (!adminOk) failed = true;

    await client.auth.signOut();
  }

  process.exit(failed ? 1 : 0);
}

main().catch((e) => {
  console.error(e.message ?? e);
  process.exit(1);
});
