-- Run AFTER all supabase/migrations/*.sql have been applied.
-- Ensures profiles exist and role = admin for the three Red Wings admins.
-- Uses auth.users emails (no invented UUIDs).
--
-- IMPORTANT: This does NOT create Auth users. If ar@ / mujahid@ are missing from
-- auth.users, only existing users (e.g. Hashim) will be promoted.
-- Prefer: npm run supabase:provision-admins (creates Auth users + profiles).

INSERT INTO public.profiles (id, full_name, role, is_active)
SELECT
  u.id,
  COALESCE(u.raw_user_meta_data ->> 'full_name', u.email, 'User'),
  CASE
    WHEN lower(u.email) = lower('hashim@redwings.com') THEN 'super_admin'::public.app_role
    ELSE 'admin'::public.app_role
  END,
  true
FROM auth.users u
WHERE lower(u.email) IN (
  lower('hashim@redwings.com'),
  lower('ar@redwings.com'),
  lower('mujahid@redwings.com')
)
ON CONFLICT (id) DO UPDATE
SET
  full_name = EXCLUDED.full_name,
  role = EXCLUDED.role,
  is_active = true,
  updated_at = timezone('utc', now());

-- Verify:
-- SELECT p.id, p.full_name, p.role, u.email
-- FROM public.profiles p
-- JOIN auth.users u ON u.id = p.id
-- WHERE p.role = 'admin';
