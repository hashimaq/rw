-- Profiles (admin auth) and safe match number generation

CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users (id) ON DELETE CASCADE,
  full_name TEXT NOT NULL,
  role public.app_role NOT NULL DEFAULT 'member',
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now())
);

CREATE TRIGGER profiles_set_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

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
      AND p.role = 'admin'
      AND p.is_active = true
  );
$$;

COMMENT ON FUNCTION public.is_admin IS
  'True when the current auth user is an active admin.';

CREATE OR REPLACE FUNCTION public.handle_new_user_profile()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, role)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data ->> 'full_name', NEW.email, 'User'),
    COALESCE((NEW.raw_user_meta_data ->> 'role')::public.app_role, 'member')
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user_profile();

-- Atomic counter for RW-001, RW-002, ... (never reused on delete)
CREATE SEQUENCE public.match_display_number_seq
  START WITH 1
  INCREMENT BY 1
  NO MINVALUE
  NO MAXVALUE
  CACHE 1;

CREATE OR REPLACE FUNCTION public.format_match_display_number(n BIGINT)
RETURNS TEXT
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT 'RW-' || lpad(n::text, 3, '0');
$$;

CREATE OR REPLACE FUNCTION public.assign_match_display_number()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
  seq_val BIGINT;
BEGIN
  IF TG_OP = 'INSERT' AND (NEW.match_number IS NULL OR btrim(NEW.match_number) = '') THEN
    seq_val := nextval('public.match_display_number_seq');
    NEW.match_number := public.format_match_display_number(seq_val);
  END IF;
  RETURN NEW;
END;
$$;

COMMENT ON SEQUENCE public.match_display_number_seq IS
  'Generates sequential display numbers; independent of admin edits to match_number text.';
