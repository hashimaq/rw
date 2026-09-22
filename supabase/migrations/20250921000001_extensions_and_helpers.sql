-- Red Wings Cricket — extensions and shared helpers

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Roles for application users (linked to auth.users via profiles)
CREATE TYPE public.app_role AS ENUM ('admin', 'member');

CREATE TYPE public.match_status AS ENUM (
  'setup',
  'live',
  'completed',
  'abandoned'
);

CREATE TYPE public.series_status AS ENUM (
  'draft',
  'active',
  'completed',
  'cancelled'
);

CREATE TYPE public.tournament_status AS ENUM (
  'draft',
  'active',
  'completed',
  'cancelled'
);

CREATE TYPE public.toss_decision AS ENUM ('bat', 'bowl');

CREATE TYPE public.match_result AS ENUM (
  'red_wings_win',
  'opponent_win',
  'tie',
  'no_result',
  'abandoned'
);

CREATE TYPE public.win_margin_type AS ENUM ('runs', 'wickets', 'other');

CREATE TYPE public.squad_status AS ENUM ('playing_xi', 'bench');

CREATE TYPE public.innings_status AS ENUM (
  'not_started',
  'in_progress',
  'completed',
  'declared',
  'forfeited'
);

CREATE TYPE public.batting_side AS ENUM ('red_wings', 'opponent');

CREATE TYPE public.extra_type AS ENUM (
  'none',
  'wide',
  'no_ball',
  'bye',
  'leg_bye',
  'penalty'
);

CREATE TYPE public.wicket_type AS ENUM (
  'bowled',
  'caught',
  'lbw',
  'run_out',
  'stumped',
  'hit_wicket',
  'retired',
  'other'
);

CREATE TYPE public.scoring_session_status AS ENUM (
  'active',
  'ended',
  'superseded',
  'admin_takeover'
);

CREATE TYPE public.manual_bowling_review_status AS ENUM (
  'draft',
  'pending_review',
  'approved',
  'rejected'
);

CREATE TYPE public.ai_analysis_status AS ENUM (
  'pending',
  'processing',
  'completed',
  'failed'
);

CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = timezone('utc', now());
  RETURN NEW;
END;
$$;
