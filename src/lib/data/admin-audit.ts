import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/database/types";
import type { AdminAuditEventWithActor } from "@/lib/audit/types";
import { createClient } from "@/lib/supabase/server";

const AUDIT_COLUMNS =
  "id, actor_user_id, action, entity_type, entity_id, previous_data, new_data, metadata, created_at";

async function attachActors(
  client: SupabaseClient<Database>,
  rows: Omit<AdminAuditEventWithActor, "actor">[],
): Promise<AdminAuditEventWithActor[]> {
  if (rows.length === 0) return [];

  const actorIds = [...new Set(rows.map((r) => r.actor_user_id))];
  const { data: profiles, error } = await client
    .from("profiles")
    .select("id, full_name")
    .in("id", actorIds);

  if (error) throw error;

  const byId = new Map(
    (profiles ?? []).map((p) => [p.id, { full_name: p.full_name }]),
  );

  return rows.map((row) => ({
    ...row,
    actor: byId.get(row.actor_user_id) ?? null,
  }));
}

export async function fetchRecentAdminAudit(
  limit = 30,
  supabase?: SupabaseClient<Database>,
): Promise<AdminAuditEventWithActor[]> {
  const client = supabase ?? (await createClient());
  const { data, error } = await client
    .from("admin_audit_events")
    .select(AUDIT_COLUMNS)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) throw error;

  const rows = (data ?? []) as Omit<AdminAuditEventWithActor, "actor">[];
  return attachActors(client, rows);
}

export async function fetchAdminAuditById(
  id: string,
  supabase?: SupabaseClient<Database>,
): Promise<AdminAuditEventWithActor | null> {
  const client = supabase ?? (await createClient());
  const { data, error } = await client
    .from("admin_audit_events")
    .select(AUDIT_COLUMNS)
    .eq("id", id)
    .maybeSingle();

  if (error) throw error;
  if (!data) return null;

  const [withActor] = await attachActors(client, [
    data as Omit<AdminAuditEventWithActor, "actor">,
  ]);
  return withActor ?? null;
}
