import type { AppRole } from "@/lib/database/types";

export const SUPER_ADMIN_REQUIRED_MESSAGE =
  "Super Admin permission required.";

export function isAdminRole(role: AppRole | null | undefined): boolean {
  return role === "admin" || role === "super_admin";
}

export function isSuperAdminRole(role: AppRole | null | undefined): boolean {
  return role === "super_admin";
}

export function adminRoleLabel(role: AppRole | null | undefined): string {
  if (role === "super_admin") return "Super Admin";
  if (role === "admin") return "Admin";
  return "Member";
}
