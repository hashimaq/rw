-- Jersey number is optional (full name remains required).

ALTER TABLE public.players
  ALTER COLUMN jersey_number DROP NOT NULL;

COMMENT ON COLUMN public.players.jersey_number IS
  'Optional squad jersey; uniqueness applies only to active official players when set.';
