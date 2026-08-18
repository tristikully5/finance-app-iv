require("dotenv").config();
const { PrismaClient } = require("@prisma/client");
const { PrismaPg } = require("@prisma/adapter-pg");

async function run() {
  const prisma = new PrismaClient({
    adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }),
  });

  try {
    await prisma.month.findMany({ take: 1 });
    console.log("month query ok");
  } catch (error) {
    console.error("month query failed:", error.message);
  }

  try {
    await prisma.categoryTemplate.findMany({ take: 1 });
    console.log("template query ok");
  } catch (error) {
    console.error("template query failed:", error.message);
  }

  await prisma.$disconnect();
}

run().catch((error) => {
  console.error("probe failed:", error.message);
  process.exit(1);
});
