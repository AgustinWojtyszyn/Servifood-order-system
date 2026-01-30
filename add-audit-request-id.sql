-- Añade request_id para idempotencia de auditoría en “guardar menú”
ALTER TABLE audit_logs
  ADD COLUMN IF NOT EXISTS request_id uuid;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'audit_logs_request_action_key'
  ) THEN
    ALTER TABLE audit_logs
      ADD CONSTRAINT audit_logs_request_action_key
      UNIQUE (request_id, action);
  END IF;
END$$;
