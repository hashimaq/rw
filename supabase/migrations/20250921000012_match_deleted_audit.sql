-- Allow audit logging when an admin deletes a match (entity row is removed).

ALTER TYPE public.admin_audit_action ADD VALUE IF NOT EXISTS 'MATCH_DELETED';
