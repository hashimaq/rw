-- Matches, squads, scoring sessions, scorer PIN hash

CREATE TABLE public.matches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  match_number TEXT NOT NULL,
  opponent_name TEXT NOT NULL,
  match_date DATE,
  venue TEXT,
  overs_limit INTEGER NOT NULL CHECK (overs_limit > 0),
  custom_overs_note TEXT,
  status public.match_status NOT NULL DEFAULT 'setup',
  series_id UUID REFERENCES public.series (id) ON DELETE SET NULL,
  tournament_id UUID REFERENCES public.tournaments (id) ON DELETE SET NULL,
  toss_winner public.batting_side,
  toss_decision public.toss_decision,
  red_wings_batting_first BOOLEAN,
  result public.match_result,
  winner public.batting_side,
  win_margin INTEGER CHECK (win_margin IS NULL OR win_margin >= 0),
  win_margin_type public.win_margin_type,
  scorer_pin_hash TEXT,
  is_public_live BOOLEAN NOT NULL DEFAULT true,
  is_public_scorecard BOOLEAN NOT NULL DEFAULT true,
  share_slug TEXT UNIQUE,
  player_of_match_id UUID REFERENCES public.players (id) ON DELETE SET NULL,
  created_by UUID REFERENCES auth.users (id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  CONSTRAINT matches_match_number_unique UNIQUE (match_number)
);

CREATE INDEX matches_status_idx ON public.matches (status);
CREATE INDEX matches_match_date_idx ON public.matches (match_date DESC);
CREATE INDEX matches_series_idx ON public.matches (series_id);
CREATE INDEX matches_tournament_idx ON public.matches (tournament_id);
CREATE INDEX matches_share_slug_idx ON public.matches (share_slug) WHERE share_slug IS NOT NULL;

CREATE TRIGGER matches_set_updated_at
  BEFORE UPDATE ON public.matches
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER matches_assign_display_number
  BEFORE INSERT ON public.matches
  FOR EACH ROW
  EXECUTE FUNCTION public.assign_match_display_number();

CREATE TABLE public.match_squads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  match_id UUID NOT NULL REFERENCES public.matches (id) ON DELETE CASCADE,
  player_id UUID NOT NULL REFERENCES public.players (id) ON DELETE RESTRICT,
  squad_status public.squad_status NOT NULL DEFAULT 'playing_xi',
  is_captain BOOLEAN NOT NULL DEFAULT false,
  is_wicketkeeper BOOLEAN NOT NULL DEFAULT false,
  batting_position INTEGER CHECK (batting_position IS NULL OR batting_position BETWEEN 1 AND 11),
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  CONSTRAINT match_squads_unique_player UNIQUE (match_id, player_id)
);

CREATE INDEX match_squads_match_idx ON public.match_squads (match_id);
CREATE INDEX match_squads_player_idx ON public.match_squads (player_id);

-- At most one captain and one wicketkeeper per match
CREATE UNIQUE INDEX match_squads_one_captain
  ON public.match_squads (match_id)
  WHERE is_captain = true;

CREATE UNIQUE INDEX match_squads_one_wicketkeeper
  ON public.match_squads (match_id)
  WHERE is_wicketkeeper = true;

CREATE TABLE public.scoring_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  match_id UUID NOT NULL REFERENCES public.matches (id) ON DELETE CASCADE,
  session_token_hash TEXT NOT NULL,
  device_label TEXT,
  status public.scoring_session_status NOT NULL DEFAULT 'active',
  started_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  last_seen_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  ended_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now())
);

CREATE INDEX scoring_sessions_match_idx ON public.scoring_sessions (match_id);
CREATE INDEX scoring_sessions_active_idx
  ON public.scoring_sessions (match_id, status)
  WHERE status = 'active';

CREATE OR REPLACE FUNCTION public.match_has_active_scoring_session(p_match_id UUID)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.scoring_sessions s
    WHERE s.match_id = p_match_id
      AND s.status = 'active'
      AND s.ended_at IS NULL
  );
$$;
