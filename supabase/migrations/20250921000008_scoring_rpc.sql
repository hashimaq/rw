-- Server-side helpers for idempotent delivery insert (used by API routes with service role)

CREATE OR REPLACE FUNCTION public.upsert_delivery_idempotent(
  p_client_event_id UUID,
  p_innings_id UUID,
  p_sequence_in_innings INTEGER,
  p_over_number INTEGER,
  p_ball_number SMALLINT,
  p_striker_player_id UUID,
  p_striker_name TEXT,
  p_non_striker_player_id UUID,
  p_non_striker_name TEXT,
  p_bowler_player_id UUID,
  p_bowler_name TEXT,
  p_batter_runs SMALLINT,
  p_total_runs SMALLINT,
  p_extras_runs SMALLINT,
  p_extra_type public.extra_type,
  p_is_legal_delivery BOOLEAN,
  p_is_boundary BOOLEAN,
  p_is_six BOOLEAN,
  p_is_wicket BOOLEAN,
  p_wicket_type public.wicket_type,
  p_dismissed_player_id UUID,
  p_dismissed_player_name TEXT,
  p_fielder_player_id UUID,
  p_fielder_name TEXT,
  p_notes TEXT
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_id UUID;
BEGIN
  INSERT INTO public.deliveries (
    client_event_id,
    innings_id,
    sequence_in_innings,
    over_number,
    ball_number,
    striker_player_id,
    striker_name,
    non_striker_player_id,
    non_striker_name,
    bowler_player_id,
    bowler_name,
    batter_runs,
    total_runs,
    extras_runs,
    extra_type,
    is_legal_delivery,
    is_boundary,
    is_six,
    is_wicket,
    wicket_type,
    dismissed_player_id,
    dismissed_player_name,
    fielder_player_id,
    fielder_name,
    notes
  )
  VALUES (
    p_client_event_id,
    p_innings_id,
    p_sequence_in_innings,
    p_over_number,
    p_ball_number,
    p_striker_player_id,
    p_striker_name,
    p_non_striker_player_id,
    p_non_striker_name,
    p_bowler_player_id,
    p_bowler_name,
    p_batter_runs,
    p_total_runs,
    p_extras_runs,
    p_extra_type,
    p_is_legal_delivery,
    p_is_boundary,
    p_is_six,
    p_is_wicket,
    p_wicket_type,
    p_dismissed_player_id,
    p_dismissed_player_name,
    p_fielder_player_id,
    p_fielder_name,
    p_notes
  )
  ON CONFLICT (client_event_id) DO UPDATE
    SET client_event_id = EXCLUDED.client_event_id
  RETURNING id INTO v_id;

  RETURN v_id;
END;
$$;

REVOKE ALL ON FUNCTION public.upsert_delivery_idempotent FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.upsert_delivery_idempotent TO service_role;
