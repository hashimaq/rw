-- Innings and ball-by-ball deliveries (source of truth)

CREATE TABLE public.innings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  match_id UUID NOT NULL REFERENCES public.matches (id) ON DELETE CASCADE,
  innings_number SMALLINT NOT NULL CHECK (innings_number BETWEEN 1 AND 4),
  batting_team public.batting_side NOT NULL,
  bowling_team public.batting_side NOT NULL,
  innings_status public.innings_status NOT NULL DEFAULT 'not_started',
  target INTEGER CHECK (target IS NULL OR target >= 0),
  overs_limit INTEGER NOT NULL CHECK (overs_limit > 0),
  total_runs INTEGER NOT NULL DEFAULT 0 CHECK (total_runs >= 0),
  wickets INTEGER NOT NULL DEFAULT 0 CHECK (wickets >= 0 AND wickets <= 10),
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  CONSTRAINT innings_unique_number UNIQUE (match_id, innings_number),
  CONSTRAINT innings_teams_differ CHECK (batting_team <> bowling_team)
);

CREATE INDEX innings_match_idx ON public.innings (match_id);

CREATE TABLE public.deliveries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_event_id UUID NOT NULL,
  innings_id UUID NOT NULL REFERENCES public.innings (id) ON DELETE CASCADE,
  sequence_in_innings INTEGER NOT NULL CHECK (sequence_in_innings > 0),
  over_number INTEGER NOT NULL CHECK (over_number >= 0),
  ball_number SMALLINT NOT NULL CHECK (ball_number >= 0 AND ball_number <= 6),
  striker_player_id UUID REFERENCES public.players (id) ON DELETE SET NULL,
  striker_name TEXT NOT NULL,
  non_striker_player_id UUID REFERENCES public.players (id) ON DELETE SET NULL,
  non_striker_name TEXT NOT NULL,
  bowler_player_id UUID REFERENCES public.players (id) ON DELETE SET NULL,
  bowler_name TEXT NOT NULL,
  batter_runs SMALLINT NOT NULL DEFAULT 0 CHECK (batter_runs >= 0 AND batter_runs <= 6),
  total_runs SMALLINT NOT NULL DEFAULT 0 CHECK (total_runs >= 0),
  extras_runs SMALLINT NOT NULL DEFAULT 0 CHECK (extras_runs >= 0),
  extra_type public.extra_type NOT NULL DEFAULT 'none',
  is_legal_delivery BOOLEAN NOT NULL DEFAULT true,
  is_boundary BOOLEAN NOT NULL DEFAULT false,
  is_six BOOLEAN NOT NULL DEFAULT false,
  is_wicket BOOLEAN NOT NULL DEFAULT false,
  wicket_type public.wicket_type,
  dismissed_player_id UUID REFERENCES public.players (id) ON DELETE SET NULL,
  dismissed_player_name TEXT,
  fielder_player_id UUID REFERENCES public.players (id) ON DELETE SET NULL,
  fielder_name TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  CONSTRAINT deliveries_client_event_unique UNIQUE (client_event_id),
  CONSTRAINT deliveries_innings_sequence_unique UNIQUE (innings_id, sequence_in_innings),
  CONSTRAINT deliveries_wicket_fields CHECK (
    (is_wicket = false AND wicket_type IS NULL)
    OR (is_wicket = true AND wicket_type IS NOT NULL)
  )
);

CREATE INDEX deliveries_innings_id_idx ON public.deliveries (innings_id);
CREATE INDEX deliveries_innings_sequence_idx ON public.deliveries (innings_id, sequence_in_innings);
CREATE INDEX deliveries_innings_over_idx ON public.deliveries (innings_id, over_number, ball_number);
CREATE INDEX deliveries_striker_idx ON public.deliveries (striker_player_id) WHERE striker_player_id IS NOT NULL;
CREATE INDEX deliveries_bowler_idx ON public.deliveries (bowler_player_id) WHERE bowler_player_id IS NOT NULL;
