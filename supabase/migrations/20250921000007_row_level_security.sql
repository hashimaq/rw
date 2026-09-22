-- Row Level Security policies

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.players ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.captain_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.series ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tournaments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.matches ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.match_squads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.scoring_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.innings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.deliveries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.partnerships ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fall_of_wickets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.manual_bowling_figures ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.match_ai_analysis ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.match_share_events ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.match_is_publicly_readable(p_match_id UUID)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.matches m
    WHERE m.id = p_match_id
      AND (
        (m.status IN ('live', 'completed') AND m.is_public_live = true)
        OR (m.status = 'completed' AND m.is_public_scorecard = true)
      )
  );
$$;

CREATE OR REPLACE FUNCTION public.innings_match_id(p_innings_id UUID)
RETURNS UUID
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT i.match_id FROM public.innings i WHERE i.id = p_innings_id;
$$;

-- Profiles
CREATE POLICY profiles_select_own ON public.profiles
  FOR SELECT TO authenticated
  USING (id = auth.uid() OR public.is_admin());

CREATE POLICY profiles_update_own ON public.profiles
  FOR UPDATE TO authenticated
  USING (id = auth.uid() OR public.is_admin())
  WITH CHECK (id = auth.uid() OR public.is_admin());

CREATE POLICY profiles_admin_insert ON public.profiles
  FOR INSERT TO authenticated
  WITH CHECK (public.is_admin());

-- Players
CREATE POLICY players_public_read ON public.players
  FOR SELECT TO anon, authenticated
  USING (true);

CREATE POLICY players_admin_write ON public.players
  FOR ALL TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- Captain history
CREATE POLICY captain_history_public_read ON public.captain_history
  FOR SELECT TO anon, authenticated
  USING (true);

CREATE POLICY captain_history_admin_write ON public.captain_history
  FOR ALL TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- Series & tournaments
CREATE POLICY series_public_read ON public.series
  FOR SELECT TO anon, authenticated
  USING (true);

CREATE POLICY series_admin_write ON public.series
  FOR ALL TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

CREATE POLICY tournaments_public_read ON public.tournaments
  FOR SELECT TO anon, authenticated
  USING (true);

CREATE POLICY tournaments_admin_write ON public.tournaments
  FOR ALL TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- Matches
CREATE POLICY matches_public_read ON public.matches
  FOR SELECT TO anon, authenticated
  USING (
    public.is_admin()
    OR (status IN ('live', 'completed', 'abandoned') AND is_public_live = true)
    OR (status = 'completed' AND is_public_scorecard = true)
  );

CREATE POLICY matches_admin_write ON public.matches
  FOR ALL TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- Match squads (readable when match is public)
CREATE POLICY match_squads_public_read ON public.match_squads
  FOR SELECT TO anon, authenticated
  USING (
    public.is_admin()
    OR public.match_is_publicly_readable(match_id)
  );

CREATE POLICY match_squads_admin_write ON public.match_squads
  FOR ALL TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- Scoring sessions: admin only via client; scorer uses server API
CREATE POLICY scoring_sessions_admin_read ON public.scoring_sessions
  FOR SELECT TO authenticated
  USING (public.is_admin());

CREATE POLICY scoring_sessions_admin_write ON public.scoring_sessions
  FOR ALL TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- Innings
CREATE POLICY innings_public_read ON public.innings
  FOR SELECT TO anon, authenticated
  USING (
    public.is_admin()
    OR public.match_is_publicly_readable(match_id)
  );

CREATE POLICY innings_admin_write ON public.innings
  FOR ALL TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- Deliveries
CREATE POLICY deliveries_public_read ON public.deliveries
  FOR SELECT TO anon, authenticated
  USING (
    public.is_admin()
    OR public.match_is_publicly_readable(public.innings_match_id(innings_id))
  );

CREATE POLICY deliveries_admin_write ON public.deliveries
  FOR ALL TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- Partnerships & fall of wickets
CREATE POLICY partnerships_public_read ON public.partnerships
  FOR SELECT TO anon, authenticated
  USING (
    public.is_admin()
    OR public.match_is_publicly_readable(public.innings_match_id(innings_id))
  );

CREATE POLICY partnerships_admin_write ON public.partnerships
  FOR ALL TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

CREATE POLICY fow_public_read ON public.fall_of_wickets
  FOR SELECT TO anon, authenticated
  USING (
    public.is_admin()
    OR public.match_is_publicly_readable(public.innings_match_id(innings_id))
  );

CREATE POLICY fow_admin_write ON public.fall_of_wickets
  FOR ALL TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- Manual bowling figures: public read when match public; admin manages review
CREATE POLICY manual_bowling_public_read ON public.manual_bowling_figures
  FOR SELECT TO anon, authenticated
  USING (
    public.is_admin()
    OR (
      review_status = 'approved'
      AND public.match_is_publicly_readable(public.innings_match_id(innings_id))
    )
  );

CREATE POLICY manual_bowling_admin_write ON public.manual_bowling_figures
  FOR ALL TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- AI analysis: public read when completed and match public
CREATE POLICY match_ai_public_read ON public.match_ai_analysis
  FOR SELECT TO anon, authenticated
  USING (
    public.is_admin()
    OR (
      status = 'completed'
      AND public.match_is_publicly_readable(match_id)
    )
  );

CREATE POLICY match_ai_admin_write ON public.match_ai_analysis
  FOR ALL TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

CREATE POLICY match_share_events_public_read ON public.match_share_events
  FOR SELECT TO anon, authenticated
  USING (
    public.is_admin()
    OR public.match_is_publicly_readable(match_id)
  );

CREATE POLICY match_share_events_admin_write ON public.match_share_events
  FOR ALL TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- Realtime: enable replication for live tables (run in Supabase dashboard or via publication)
ALTER PUBLICATION supabase_realtime ADD TABLE public.matches;
ALTER PUBLICATION supabase_realtime ADD TABLE public.innings;
ALTER PUBLICATION supabase_realtime ADD TABLE public.deliveries;
