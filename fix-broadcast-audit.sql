DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_enum e JOIN pg_type t ON e.enumtypid = t.oid WHERE t.typname = 'AuditAction' AND e.enumlabel = 'BROADCAST_SEND') THEN
    ALTER TYPE "AuditAction" ADD VALUE 'BROADCAST_SEND';
  END IF;
END $$;
