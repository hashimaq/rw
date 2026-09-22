-- Public scorers can resolve setup/live share links (PIN flow) without Supabase Auth.

DROP POLICY IF EXISTS matches_public_read ON public.matches;

CREATE POLICY matches_public_read ON public.matches
  FOR SELECT TO anon, authenticated
  USING (
    public.is_admin()
    OR (
      status IN ('setup', 'live', 'completed', 'abandoned')
      AND is_public_live = true
    )
    OR (status = 'completed' AND is_public_scorecard = true)
  );
