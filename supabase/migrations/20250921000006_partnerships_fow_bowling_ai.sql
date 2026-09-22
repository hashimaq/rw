-- Partnerships, fall of wickets, manual bowling figures, AI analysis

CREATE TABLE public.partnerships (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  innings_id UUID NOT NULL REFERENCES public.innings (id) ON DELETE CASCADE,
  partnership_number SMALLINT NOT NULL CHECK (partnership_number > 0),
  batter_1_player_id UUID REFERENCES public.players (id) ON DELETE SET NULL,
  batter_1_name TEXT NOT NULL,
  batter_2_player_id UUID REFERENCES public.players (id) ON DELETE SET NULL,
  batter_2_name TEXT NOT NULL,
  runs INTEGER NOT NULL DEFAULT 0 CHECK (runs >= 0),
  balls INTEGER NOT NULL DEFAULT 0 CHECK (balls >= 0),
  start_score INTEGER NOT NULL DEFAULT 0 CHECK (start_score >= 0),
  end_score INTEGER CHECK (end_score IS NULL OR end_score >= start_score),
  started_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  ended_at TIMESTAMPTZ,
  CONSTRAINT partnerships_unique_number UNIQUE (innings_id, partnership_number)
);

CREATE INDEX partnerships_innings_idx ON public.partnerships (innings_id);

CREATE TABLE public.fall_of_wickets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  innings_id UUID NOT NULL REFERENCES public.innings (id) ON DELETE CASCADE,
  wicket_number SMALLINT NOT NULL CHECK (wicket_number BETWEEN 1 AND 10),
  score_at_wicket INTEGER NOT NULL CHECK (score_at_wicket >= 0),
  dismissed_player_id UUID REFERENCES public.players (id) ON DELETE SET NULL,
  dismissed_player_name TEXT NOT NULL,
  over_number INTEGER NOT NULL CHECK (over_number >= 0),
  ball_number SMALLINT NOT NULL CHECK (ball_number >= 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  CONSTRAINT fall_of_wickets_unique UNIQUE (innings_id, wicket_number)
);

CREATE INDEX fall_of_wickets_innings_idx ON public.fall_of_wickets (innings_id);

-- Manual bowling figures: never overwrites official delivery-derived data without review
CREATE TABLE public.manual_bowling_figures (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  innings_id UUID NOT NULL REFERENCES public.innings (id) ON DELETE CASCADE,
  bowler_player_id UUID REFERENCES public.players (id) ON DELETE SET NULL,
  bowler_name TEXT NOT NULL,
  overs_decimal NUMERIC(4, 1) NOT NULL CHECK (overs_decimal >= 0),
  maidens INTEGER NOT NULL DEFAULT 0 CHECK (maidens >= 0),
  runs_conceded INTEGER NOT NULL DEFAULT 0 CHECK (runs_conceded >= 0),
  wickets INTEGER NOT NULL DEFAULT 0 CHECK (wickets >= 0),
  economy NUMERIC(6, 2),
  review_status public.manual_bowling_review_status NOT NULL DEFAULT 'draft',
  submitted_by UUID REFERENCES auth.users (id) ON DELETE SET NULL,
  reviewed_by UUID REFERENCES auth.users (id) ON DELETE SET NULL,
  reviewed_at TIMESTAMPTZ,
  review_notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now())
);

CREATE INDEX manual_bowling_figures_innings_idx ON public.manual_bowling_figures (innings_id);

CREATE TRIGGER manual_bowling_figures_set_updated_at
  BEFORE UPDATE ON public.manual_bowling_figures
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE public.match_ai_analysis (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  match_id UUID NOT NULL REFERENCES public.matches (id) ON DELETE CASCADE,
  status public.ai_analysis_status NOT NULL DEFAULT 'pending',
  player_of_match_id UUID REFERENCES public.players (id) ON DELETE SET NULL,
  generated_analysis JSONB,
  model_version TEXT,
  error_message TEXT,
  generated_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  CONSTRAINT match_ai_analysis_one_per_match UNIQUE (match_id)
);

CREATE TRIGGER match_ai_analysis_set_updated_at
  BEFORE UPDATE ON public.match_ai_analysis
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

-- Optional materialized path for public share metadata (slug lives on matches)
CREATE TABLE public.match_share_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  match_id UUID NOT NULL REFERENCES public.matches (id) ON DELETE CASCADE,
  event_type TEXT NOT NULL,
  metadata JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now())
);

CREATE INDEX match_share_events_match_idx ON public.match_share_events (match_id);
