DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'PaymentStatus') THEN
    CREATE TYPE "PaymentStatus" AS ENUM ('PENDING','COMPLETED','FAILED','REFUNDED');
  END IF;
END $$;

ALTER TABLE "Payment" ALTER COLUMN status DROP DEFAULT;

ALTER TABLE "Payment"
  ALTER COLUMN status TYPE "PaymentStatus"
  USING COALESCE(status, 'PENDING')::"PaymentStatus";

ALTER TABLE "Payment" ALTER COLUMN status SET DEFAULT 'PENDING'::"PaymentStatus";
