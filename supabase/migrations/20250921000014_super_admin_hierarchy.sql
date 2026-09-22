-- Part 1/2: add enum value only (must commit before use — see 20250921000015).

ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'super_admin';
