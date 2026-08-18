import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";

function resolveDatabaseUrl() {
  return (
    process.env.DATABASE_URL ??
    process.env.POSTGRES_PRISMA_URL ??
    process.env.POSTGRES_URL ??
    process.env.POSTGRES_URL_NON_POOLING ??
    process.env.DATABASE_URL_NON_POOLING
  );
}

const globalForPrisma = global as unknown as {
  prisma?: PrismaClient;
};

function createPrismaClient() {
  const connectionString = resolveDatabaseUrl();

  if (!connectionString) {
    throw new Error(
      "Missing database connection string. Set one of: DATABASE_URL, DATABASE_URL_NON_POOLING, POSTGRES_PRISMA_URL, POSTGRES_URL, or POSTGRES_URL_NON_POOLING to a reachable PostgreSQL connection string."
    );
  }

  if (!process.env.DATABASE_URL) {
    process.env.DATABASE_URL = connectionString;
  }

  const adapter = new PrismaPg({ connectionString });
  return new PrismaClient({ adapter });
}

export const prisma = globalForPrisma.prisma ?? createPrismaClient();

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}