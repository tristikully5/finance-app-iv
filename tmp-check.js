const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

prisma.category.update({
  where: { id: 2 },
  data: { name: 'Tranports', type: 'Expense', icon: '📦' },
})
  .then(() => {
    console.log('update-ok');
  })
  .catch((err) => {
    console.error(err.message);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
