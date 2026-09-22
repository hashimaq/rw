export const ADMIN_AUDIT_ACTIONS = [
  "PLAYER_CREATED",
  "PLAYER_UPDATED",
  "PLAYER_DEACTIVATED",
  "PLAYER_REACTIVATED",
  "MATCH_CREATED",
  "MATCH_UPDATED",
  "MATCH_STATUS_CHANGED",
  "MATCH_DELETED",
  "MATCH_DELETED_BY_SCORER",
  "SCORING_SESSION_STARTED",
  "SCORING_SESSION_ENDED",
  "SERIES_CREATED",
  "SERIES_UPDATED",
  "TOURNAMENT_CREATED",
  "TOURNAMENT_UPDATED",
  "MANUAL_CORRECTION",
  "SCORING_CONTROL_REQUESTED",
  "SCORING_CONTROL_TRANSFERRED",
  "SCORING_CONTROL_DECLINED",
  "SCORING_CONTROL_REVOKED",
  "ADMIN_SCORING_TAKEOVER",
  "STATS_CORRECTED",
  "RECORD_CORRECTED",
  "MATCH_CORRECTED",
  "PLAYER_STATS_CORRECTED",
  "CAPTAIN_HISTORY_CORRECTED",
] as const;

export type AdminAuditAction = (typeof ADMIN_AUDIT_ACTIONS)[number];

export const ADMIN_AUDIT_ENTITIES = [
  "player",
  "match",
  "series",
  "tournament",
  "scoring_session",
  "settings",
  "other",
] as const;

export type AdminAuditEntity = (typeof ADMIN_AUDIT_ENTITIES)[number];

export interface AdminAuditEventRow {
  id: string;
  actor_user_id: string;
  action: AdminAuditAction;
  entity_type: AdminAuditEntity;
  entity_id: string | null;
  previous_data: Record<string, unknown> | null;
  new_data: Record<string, unknown> | null;
  metadata: Record<string, unknown>;
  created_at: string;
}

export type AdminAuditEventWithActor = AdminAuditEventRow & {
  actor: { full_name: string } | null;
};
