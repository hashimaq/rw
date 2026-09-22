-- Part 2/2: Super Admin hierarchy (run after 20250921000014 committed).

CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.profiles p
    WHERE p.id = auth.uid()
      AND p.role IN ('admin', 'super_admin')
      AND p.is_active = true
  );
$$;

CREATE OR REPLACE FUNCTION public.is_super_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.profiles p
    WHERE p.id = auth.uid()
      AND p.role = 'super_admin'
      AND p.is_active = true
  );
$$;

COMMENT ON FUNCTION public.is_super_admin IS
  'True when the current auth user is the active Super Admin.';

-- Sole Super Admin: Hashim (stable auth email, not display name).
UPDATE public.profiles p
SET role = 'super_admin'::public.app_role,
    updated_at = timezone('utc', now())
FROM auth.users u
WHERE p.id = u.id
  AND lower(u.email) = lower('hashim@redwings.com');

-- Ensure other provisioned admins remain normal admins.
UPDATE public.profiles p
SET role = 'admin'::public.app_role,
    updated_at = timezone('utc', now())
FROM auth.users u
WHERE p.id = u.id
  AND lower(u.email) IN (lower('ar@redwings.com'), lower('mujahid@redwings.com'))
  AND p.role <> 'super_admin'::public.app_role;

CREATE OR REPLACE FUNCTION public.enforce_profile_role_privilege()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'UPDATE' AND NEW.role IS DISTINCT FROM OLD.role THEN
    IF NOT public.is_super_admin() THEN
      RAISE EXCEPTION 'role_change_forbidden';
    END IF;
    IF NEW.role = 'super_admin'::public.app_role
       AND OLD.role <> 'super_admin'::public.app_role
       AND auth.uid() IS DISTINCT FROM OLD.id THEN
      RAISE EXCEPTION 'super_admin_promotion_forbidden';
    END IF;
    IF OLD.role = 'super_admin'::public.app_role
       AND NEW.role <> 'super_admin'::public.app_role THEN
      IF NOT EXISTS (
        SELECT 1
        FROM public.profiles p
        WHERE p.role = 'super_admin'::public.app_role
          AND p.is_active = true
          AND p.id <> OLD.id
      ) THEN
        RAISE EXCEPTION 'last_super_admin';
      END IF;
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS profiles_enforce_role_privilege ON public.profiles;
CREATE TRIGGER profiles_enforce_role_privilege
  BEFORE UPDATE OF role ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.enforce_profile_role_privilege();

-- Historical / statistical tables: Super Admin write; all admins read via existing SELECT policies.
DROP POLICY IF EXISTS captain_history_admin_write ON public.captain_history;
CREATE POLICY captain_history_super_admin_write ON public.captain_history
  FOR ALL TO authenticated
  USING (public.is_super_admin())
  WITH CHECK (public.is_super_admin());

DROP POLICY IF EXISTS manual_bowling_admin_write ON public.manual_bowling_figures;
CREATE POLICY manual_bowling_super_admin_write ON public.manual_bowling_figures
  FOR ALL TO authenticated
  USING (public.is_super_admin())
  WITH CHECK (public.is_super_admin());

DROP POLICY IF EXISTS partnerships_admin_write ON public.partnerships;
CREATE POLICY partnerships_super_admin_write ON public.partnerships
  FOR ALL TO authenticated
  USING (public.is_super_admin())
  WITH CHECK (public.is_super_admin());

DROP POLICY IF EXISTS fow_admin_write ON public.fall_of_wickets;
CREATE POLICY fow_super_admin_write ON public.fall_of_wickets
  FOR ALL TO authenticated
  USING (public.is_super_admin())
  WITH CHECK (public.is_super_admin());

DROP POLICY IF EXISTS deliveries_admin_write ON public.deliveries;
CREATE POLICY deliveries_super_admin_write ON public.deliveries
  FOR ALL TO authenticated
  USING (public.is_super_admin())
  WITH CHECK (public.is_super_admin());

DROP POLICY IF EXISTS innings_admin_write ON public.innings;
CREATE POLICY innings_super_admin_write ON public.innings
  FOR ALL TO authenticated
  USING (public.is_super_admin())
  WITH CHECK (public.is_super_admin());

-- Matches: admins may create/delete; only Super Admin may update completed/abandoned records.
DROP POLICY IF EXISTS matches_admin_write ON public.matches;

CREATE POLICY matches_admin_insert ON public.matches
  FOR INSERT TO authenticated
  WITH CHECK (public.is_admin());

CREATE POLICY matches_admin_delete ON public.matches
  FOR DELETE TO authenticated
  USING (public.is_admin());

CREATE POLICY matches_admin_update ON public.matches
  FOR UPDATE TO authenticated
  USING (public.is_admin())
  WITH CHECK (
    public.is_super_admin()
    OR (
      public.is_admin()
      AND status IN ('setup', 'live')
    )
  );

-- Profile updates: admins may not change roles (trigger); tighten broad admin profile edits.
DROP POLICY IF EXISTS profiles_update_own ON public.profiles;
CREATE POLICY profiles_update_own ON public.profiles
  FOR UPDATE TO authenticated
  USING (
    id = auth.uid()
    OR public.is_super_admin()
  )
  WITH CHECK (
    id = auth.uid()
    OR public.is_super_admin()
  );

ALTER TYPE public.admin_audit_action ADD VALUE IF NOT EXISTS 'STATS_CORRECTED';
ALTER TYPE public.admin_audit_action ADD VALUE IF NOT EXISTS 'RECORD_CORRECTED';
ALTER TYPE public.admin_audit_action ADD VALUE IF NOT EXISTS 'MATCH_CORRECTED';
ALTER TYPE public.admin_audit_action ADD VALUE IF NOT EXISTS 'PLAYER_STATS_CORRECTED';
ALTER TYPE public.admin_audit_action ADD VALUE IF NOT EXISTS 'CAPTAIN_HISTORY_CORRECTED';

-- Never bootstrap Super Admin from Auth user metadata.
CREATE OR REPLACE FUNCTION public.handle_new_user_profile()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  requested_role public.app_role;
BEGIN
  requested_role := COALESCE(
    (NEW.raw_user_meta_data ->> 'role')::public.app_role,
    'member'::public.app_role
  );
  IF requested_role = 'super_admin'::public.app_role THEN
    requested_role := 'member'::public.app_role;
  END IF;

  INSERT INTO public.profiles (id, full_name, role)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data ->> 'full_name', NEW.email, 'User'),
    requested_role
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;
