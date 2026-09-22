import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/database/types";
import { getCurrentProfileRole } from "@/lib/auth/admin";
import { adminRoleLabel } from "@/lib/auth/roles";
import { sanitizeAuditPayload } from "@/lib/audit/sanitize";
import type { AdminAuditAction, AdminAuditEntity } from "@/lib/audit/types";

export interface RecordAuditInput {
  action: AdminAuditAction;
  entity_type: AdminAuditEntity;
  entity_id?: string | null;
  previous_data?: Record<string, unknown> | null;
  new_data?: Record<string, unknown> | null;
  metadata?: Record<string, unknown> | null;
}

/** Append audit row after a successful mutation. Actor is always auth.uid(). */
export async function recordAdminAuditEvent(
  supabase: SupabaseClient<Database>,
  input: RecordAuditInput,
): Promise<void> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    throw new Error("Authenticated user required for audit");
  }

  const actorRole = await getCurrentProfileRole(supabase);
  const baseMetadata = {
    ...(input.metadata ?? {}),
    actor_role: actorRole,
    actor_role_label: adminRoleLabel(actorRole),
  };

  const { error } = await supabase.from("admin_audit_events").insert({
    actor_user_id: user.id,
    action: input.action,
    entity_type: input.entity_type,
    entity_id: input.entity_id ?? null,
    previous_data: sanitizeAuditPayload(input.previous_data ?? null),
    new_data: sanitizeAuditPayload(input.new_data ?? null),
    metadata:
      sanitizeAuditPayload(baseMetadata) ?? ({} as Record<string, unknown>),
  });

  if (error) throw error;
}

/** Insert audit row with service role (bypasses RLS). Actor must be verified server-side first. */
export async function recordAdminAuditEventAsService(
  supabase: SupabaseClient<Database>,
  actorUserId: string,
  actorRole: Awaited<ReturnType<typeof getCurrentProfileRole>>,
  input: RecordAuditInput,
): Promise<void> {
  const baseMetadata = {
    ...(input.metadata ?? {}),
    actor_role: actorRole,
    actor_role_label: adminRoleLabel(actorRole),
  };

  const { error } = await supabase.from("admin_audit_events").insert({
    actor_user_id: actorUserId,
    action: input.action,
    entity_type: input.entity_type,
    entity_id: input.entity_id ?? null,
    previous_data: sanitizeAuditPayload(input.previous_data ?? null),
    new_data: sanitizeAuditPayload(input.new_data ?? null),
    metadata:
      sanitizeAuditPayload(baseMetadata) ?? ({} as Record<string, unknown>),
  });

  if (error) throw error;
}
