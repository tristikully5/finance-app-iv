import { prisma } from "@/lib/prisma";

export async function ensureMonthSnapshot(monthKey: string) {
  if (!monthKey) {
    throw new Error("Month key is required to create a snapshot.");
  }

  const month = await prisma.month.upsert({
    where: { key: monthKey },
    update: {},
    create: { key: monthKey },
  });

  const templates = await prisma.categoryTemplate.findMany({
    where: { archived: false },
    orderBy: [{ sortOrder: "asc" }, { id: "asc" }],
  });

  if (templates.length > 0) {
    await prisma.monthCategory.createMany({
      data: templates.map((template) => ({
        monthId: month.id,
        templateCategoryId: template.id,
        name: template.name,
        type: template.type,
        icon: template.icon,
        color: template.color,
        sortOrder: template.sortOrder,
        archived: template.archived,
        budgetAmount: template.type === "Expense" ? template.defaultBudgetAmount : 0,
        budgetCurrency: template.type === "Expense" ? template.defaultBudgetCurrency : "SGD",
      })),
      skipDuplicates: true,
    });
  }

  return month;
}
