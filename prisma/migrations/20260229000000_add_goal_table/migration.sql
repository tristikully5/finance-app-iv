CREATE TABLE IF NOT EXISTS "Goal" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'Progressing',
    "amountUsed" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Goal_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "Transaction"
ADD COLUMN IF NOT EXISTS "goalId" INTEGER;

CREATE INDEX IF NOT EXISTS "Transaction_goalId_idx" ON "Transaction"("goalId");

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'Transaction_goalId_fkey'
  ) THEN
    ALTER TABLE "Transaction"
    ADD CONSTRAINT "Transaction_goalId_fkey"
    FOREIGN KEY ("goalId") REFERENCES "Goal"("id")
    ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;