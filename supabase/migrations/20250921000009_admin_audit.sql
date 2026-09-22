-- Admin audit log (append-only, admin-readable)

CREATE TYPE public.admin_audit_action AS ENUM (
  'PLAYER_CREATED',
  'PLAYER_UPDATED',
  'PLAYER_DEACTIVATED',
  'PLAYER_REACTIVATED',
  'MATCH_CREATED',
  'MATCH_UPDATED',
  'MATCH_STATUS_CHANGED',
  'SCORING_SESSION_STARTED',
  'SCORING_SESSION_ENDED',
  'SERIES_CREATED',
  'SERIES_UPDATED',
  'TOURNAMENT_CREATED',
  'TOURNAMENT_UPDATED',
  'MANUAL_CORRECTION'
);

CREATE TYPE public.admin_audit_entity AS ENUM (
  'player',
  'match',
  'series',
  'tournament',
  'scoring_session',
  'settings',
  'other'
);

CREATE TABLE public.admin_audit_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_user_id UUID NOT NULL REFERENCES public.profiles (id) ON DELETE RESTRICT,
  action public.admin_audit_action NOT NULL,
  entity_type public.admin_audit_entity NOT NULL,
  entity_id UUID,
  previous_data JSONB,
  new_data JSONB,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX admin_audit_events_created_at_idx
  ON public.admin_audit_events (created_at DESC);

CREATE INDEX admin_audit_events_actor_created_idx
  ON public.admin_audit_events (actor_user_id, created_at DESC);

CREATE INDEX admin_audit_events_entity_idx
  ON public.admin_audit_events (entity_type, entity_id);

CREATE INDEX admin_audit_events_action_idx
  ON public.admin_audit_events (action);

ALTER TABLE public.admin_audit_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY admin_audit_events_select ON public.admin_audit_events
  FOR SELECT TO authenticated
  USING (public.is_admin());

CREATE POLICY admin_audit_events_insert ON public.admin_audit_events
  FOR INSERT TO authenticated
  WITH CHECK (public.is_admin() AND actor_user_id = auth.uid());

ALTER PUBLICATION supabase_realtime ADD TABLE public.admin_audit_events;
