import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database, AdminAuditAction } from "@/lib/database/types";
import { sanitizeAuditPayload } from "@/lib/audit/sanitize";

/** Scorer control events (service role; actor is match creator for audit FK). */
export async function recordScoringControlAudit(
  supabase: SupabaseClient<Database>,
  input: {
    action: AdminAuditAction;
    matchId: string;
    actorUserId: string;
    metadata?: Record<string, unknown>;
    previous_data?: Record<string, unknown> | null;
    new_data?: Record<string, unknown> | null;
  },
): Promise<void> {
  const { error } = await supabase.from("admin_audit_events").insert({
    actor_user_id: input.actorUserId,
    action: input.action,
    entity_type: "match",
    entity_id: input.matchId,
    previous_data: sanitizeAuditPayload(input.previous_data ?? null),
    new_data: sanitizeAuditPayload(input.new_data ?? null),
    metadata:
      sanitizeAuditPayload(input.metadata ?? {}) ??
      ({} as Record<string, unknown>),
  });
  if (error) throw error;
}

export async function resolveMatchAuditActorUserId(
  supabase: SupabaseClient<Database>,
  matchId: string,
): Promise<string> {
  const { data, error } = await supabase
    .from("matches")
    .select("created_by")
    .eq("id", matchId)
    .maybeSingle();
  if (!error && data?.created_by) {
    return data.created_by;
  }

  const { data: adminProfile, error: adminError } = await supabase
    .from("profiles")
    .select("id")
    .in("role", ["admin", "super_admin"])
    .eq("is_active", true)
    .limit(1)
    .maybeSingle();

  if (adminError || !adminProfile) {
    throw new Error("Audit actor required");
  }
  return adminProfile.id;
}
