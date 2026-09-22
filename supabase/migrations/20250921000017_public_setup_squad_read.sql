-- Public Match Ready / setup squads readable when match is shared for scoring.

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
        OR (
          m.status = 'setup'
          AND m.is_public_live = true
          AND m.share_slug IS NOT NULL
        )
      )
  );
$$;
