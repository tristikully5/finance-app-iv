require("dotenv").config();
const { Client } = require("pg");
const { PrismaPg } = require("@prisma/adapter-pg");
const { PrismaClient } = require("@prisma/client");

async function ensureGoalTable() {
  const client = new Client({ connectionString: process.env.DATABASE_URL });
  await client.connect();

  await client.query(`
    CREATE TABLE IF NOT EXISTS "Goal" (
      "id" SERIAL PRIMARY KEY,
      "name" TEXT NOT NULL,
      "amount" DOUBLE PRECISION NOT NULL,
      "status" TEXT NOT NULL DEFAULT 'Progressing',
      "amountUsed" DOUBLE PRECISION NOT NULL DEFAULT 0,
      "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
    )
  `);

  await client.query(`ALTER TABLE "Transaction" ADD COLUMN IF NOT EXISTS "goalId" INTEGER`);
  await client.query(`CREATE INDEX IF NOT EXISTS "Transaction_goalId_idx" ON "Transaction" ("goalId")`);
  await client.query(`
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
  `);

  await client.end();
}

async function verifyPrismaQuery() {
  const prisma = new PrismaClient({
    adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }),
  });

  try {
    const goals = await prisma.goal.findMany({ take: 1 });
    console.log(`goal query ok (${goals.length} row(s) fetched)`);
  } finally {
    await prisma.$disconnect();
  }
}

async function main() {
  await ensureGoalTable();
  await verifyPrismaQuery();
}

main().catch((error) => {
  console.error(error instanceof Error ? error.stack || error.message : error);
  process.exit(1);
});