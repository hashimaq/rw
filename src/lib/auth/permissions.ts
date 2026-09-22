/**
 * Central classification for admin API authorization.
 * Use requireAdmin() for standard admin mutations (matches, squad, delete match, …).
 * Use requireSuperAdmin() for historical/statistical corrections and sensitive config.
 */

export { requireAdmin, requireSuperAdmin } from "@/lib/auth/admin";
export { SUPER_ADMIN_REQUIRED_MESSAGE } from "@/lib/auth/roles";
