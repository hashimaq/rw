-- Match-only (guest) players: stable UUID in players table, excluded from official squad lists.

ALTER TABLE public.players
  ADD COLUMN IF NOT EXISTS is_official_squad BOOLEAN NOT NULL DEFAULT true;

COMMENT ON COLUMN public.players.is_official_squad IS
  'False for match-only guest identities; not shown in official squad management.';

DROP INDEX IF EXISTS public.players_active_jersey_unique;

CREATE UNIQUE INDEX players_active_jersey_unique
  ON public.players (jersey_number)
  WHERE is_active = true
    AND archived_at IS NULL
    AND is_official_squad = true;

CREATE INDEX players_official_squad_idx
  ON public.players (is_official_squad)
  WHERE is_official_squad = true;
