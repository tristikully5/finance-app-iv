require('dotenv').config();
const { prisma } = require('./lib/prisma');

async function main() {
  try {
    const rows = await prisma.category.findMany({ where: { archived: false }, orderBy: { createdAt: 'desc' } });
    console.log(JSON.stringify(rows, null, 2));
  } catch (error) {
    console.error(error.message);
    process.exitCode = 1;
  } finally {
    await prisma.$disconnect();
  }
}

main();
