import type { SupabaseClient } from "@supabase/supabase-js";
import type { AppRole, Database } from "@/lib/database/types";
import {
  adminRoleLabel,
  isAdminRole,
  isSuperAdminRole,
  SUPER_ADMIN_REQUIRED_MESSAGE,
} from "@/lib/auth/roles";

export class AuthorizationError extends Error {
  readonly status: number;

  constructor(message: string, status = 403) {
    super(message);
    this.name = "AuthorizationError";
    this.status = status;
  }
}

export async function getCurrentUser(supabase: SupabaseClient<Database>) {
  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user) return null;
  return data.user;
}

export async function getCurrentProfileRole(
  supabase: SupabaseClient<Database>,
): Promise<AppRole | null> {
  const user = await getCurrentUser(supabase);
  if (!user) return null;

  const { data, error } = await supabase
    .from("profiles")
    .select("role, is_active")
    .eq("id", user.id)
    .maybeSingle();

  if (error || !data || !data.is_active) return null;
  return data.role;
}

export async function getAdminAuthorization(
  supabase: SupabaseClient<Database>,
) {
  const role = await getCurrentProfileRole(supabase);
  const admin = isAdminRole(role);
  const superAdmin = isSuperAdminRole(role);
  return {
    role,
    admin,
    superAdmin,
    label: adminRoleLabel(role),
  };
}

export async function isAdmin(supabase: SupabaseClient<Database>) {
  const role = await getCurrentProfileRole(supabase);
  return isAdminRole(role);
}

export async function isSuperAdmin(supabase: SupabaseClient<Database>) {
  const role = await getCurrentProfileRole(supabase);
  return isSuperAdminRole(role);
}

export async function requireAdmin(supabase: SupabaseClient<Database>) {
  const ok = await isAdmin(supabase);
  if (!ok) {
    throw new AuthorizationError("Admin authorization required");
  }
}

export async function requireSuperAdmin(supabase: SupabaseClient<Database>) {
  const ok = await isSuperAdmin(supabase);
  if (!ok) {
    throw new AuthorizationError(SUPER_ADMIN_REQUIRED_MESSAGE);
  }
}
