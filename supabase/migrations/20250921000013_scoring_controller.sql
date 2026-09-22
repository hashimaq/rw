-- One active scoring controller per match; viewer sessions allowed.

ALTER TABLE public.scoring_sessions
  ADD COLUMN IF NOT EXISTS is_scoring_controller BOOLEAN NOT NULL DEFAULT false;

COMMENT ON COLUMN public.scoring_sessions.is_scoring_controller IS
  'When true, this active session may submit scoring mutations for the match.';

-- Backfill: existing sole active sessions become controllers.
UPDATE public.scoring_sessions s
SET is_scoring_controller = true
WHERE s.status = 'active'
  AND s.ended_at IS NULL
  AND NOT EXISTS (
    SELECT 1
    FROM public.scoring_sessions c
    WHERE c.match_id = s.match_id
      AND c.is_scoring_controller = true
      AND c.status = 'active'
      AND c.ended_at IS NULL
      AND c.id <> s.id
  );

CREATE UNIQUE INDEX IF NOT EXISTS scoring_sessions_one_controller_per_match
  ON public.scoring_sessions (match_id)
  WHERE status = 'active'
    AND is_scoring_controller = true
    AND ended_at IS NULL;

CREATE TYPE public.scoring_control_transfer_status AS ENUM (
  'pending',
  'approved',
  'rejected',
  'cancelled',
  'expired'
);

CREATE TABLE public.scoring_control_transfers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  match_id UUID NOT NULL REFERENCES public.matches (id) ON DELETE CASCADE,
  requesting_session_id UUID NOT NULL REFERENCES public.scoring_sessions (id) ON DELETE CASCADE,
  controller_session_id UUID NOT NULL REFERENCES public.scoring_sessions (id) ON DELETE CASCADE,
  status public.scoring_control_transfer_status NOT NULL DEFAULT 'pending',
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  resolved_at TIMESTAMPTZ,
  CONSTRAINT scoring_control_transfers_distinct_sessions CHECK (
    requesting_session_id <> controller_session_id
  )
);

CREATE INDEX scoring_control_transfers_match_status_idx
  ON public.scoring_control_transfers (match_id, status);

CREATE INDEX scoring_control_transfers_pending_controller_idx
  ON public.scoring_control_transfers (controller_session_id, status)
  WHERE status = 'pending';

ALTER TABLE public.scoring_control_transfers ENABLE ROW LEVEL SECURITY;

CREATE POLICY scoring_control_transfers_admin_read ON public.scoring_control_transfers
  FOR SELECT TO authenticated
  USING (public.is_admin());

ALTER PUBLICATION supabase_realtime ADD TABLE public.scoring_control_transfers;

-- Atomic approve: swap controller to requester.
CREATE OR REPLACE FUNCTION public.approve_scoring_control_transfer(p_transfer_id UUID)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_transfer public.scoring_control_transfers%ROWTYPE;
  v_now TIMESTAMPTZ := timezone('utc', now());
BEGIN
  SELECT * INTO v_transfer
  FROM public.scoring_control_transfers
  WHERE id = p_transfer_id
  FOR UPDATE;

  IF NOT FOUND OR v_transfer.status <> 'pending' THEN
    RAISE EXCEPTION 'transfer_not_pending';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.scoring_sessions
    WHERE id = v_transfer.controller_session_id
      AND match_id = v_transfer.match_id
      AND status = 'active'
      AND ended_at IS NULL
      AND is_scoring_controller = true
  ) THEN
    RAISE EXCEPTION 'controller_no_longer_active';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.scoring_sessions
    WHERE id = v_transfer.requesting_session_id
      AND match_id = v_transfer.match_id
      AND status = 'active'
      AND ended_at IS NULL
  ) THEN
    RAISE EXCEPTION 'requester_session_invalid';
  END IF;

  UPDATE public.scoring_sessions
  SET is_scoring_controller = false,
      last_seen_at = v_now
  WHERE id = v_transfer.controller_session_id
    AND is_scoring_controller = true;

  UPDATE public.scoring_sessions
  SET is_scoring_controller = true,
      last_seen_at = v_now
  WHERE id = v_transfer.requesting_session_id;

  UPDATE public.scoring_control_transfers
  SET status = 'approved',
      resolved_at = v_now
  WHERE id = p_transfer_id;

  UPDATE public.scoring_control_transfers
  SET status = 'expired',
      resolved_at = v_now
  WHERE match_id = v_transfer.match_id
    AND status = 'pending'
    AND id <> p_transfer_id;

  RETURN v_transfer.requesting_session_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.release_scoring_controller(p_match_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_now TIMESTAMPTZ := timezone('utc', now());
BEGIN
  UPDATE public.scoring_control_transfers
  SET status = 'expired',
      resolved_at = v_now
  WHERE match_id = p_match_id
    AND status = 'pending';

  UPDATE public.scoring_sessions
  SET is_scoring_controller = false,
      last_seen_at = v_now
  WHERE match_id = p_match_id
    AND status = 'active'
    AND is_scoring_controller = true
    AND ended_at IS NULL;
END;
$$;

ALTER TYPE public.admin_audit_action ADD VALUE IF NOT EXISTS 'SCORING_CONTROL_REQUESTED';
ALTER TYPE public.admin_audit_action ADD VALUE IF NOT EXISTS 'SCORING_CONTROL_TRANSFERRED';
ALTER TYPE public.admin_audit_action ADD VALUE IF NOT EXISTS 'SCORING_CONTROL_DECLINED';
ALTER TYPE public.admin_audit_action ADD VALUE IF NOT EXISTS 'SCORING_CONTROL_REVOKED';
ALTER TYPE public.admin_audit_action ADD VALUE IF NOT EXISTS 'ADMIN_SCORING_TAKEOVER';
