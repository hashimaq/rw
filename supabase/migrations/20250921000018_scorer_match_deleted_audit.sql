-- Audit when a scorer deletes their own match via scoring session.

ALTER TYPE public.admin_audit_action ADD VALUE IF NOT EXISTS 'MATCH_DELETED_BY_SCORER';
