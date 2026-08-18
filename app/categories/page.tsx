import { prisma } from "@/lib/prisma";
import { buildMonthKey, formatMonthLabel, parseMonthValue } from "@/lib/budgets";
import CategoriesBoard from "@/components/CategoriesBoard";
import { ensureMonthSnapshot } from "@/lib/month-snapshots";
import PageHeader from "@/components/PageHeader";

export const dynamic = "force-dynamic";

export default async function CategoriesPage() {
  const currentMonthKey = buildMonthKey(new Date().getFullYear(), new Date().getMonth() + 1);
  const selectedMonth = parseMonthValue(currentMonthKey);
  const startOfMonth = new Date(selectedMonth.year, selectedMonth.month - 1, 1);
  const endOfMonth = new Date(selectedMonth.year, selectedMonth.month, 0, 23, 59, 59, 999);

  let expenses: Array<{
    id: number;
    name: string;
    type: string;
    icon: string;
    sortOrder: number;
    monthlyTotal: number;
    monthlyCurrency: string;
    monthlyBudget: number;
    monthlyBudgetCurrency: string;
    defaultBudgetAmount: number;
    defaultBudgetCurrency: string;
  }> = [];

  let incomes: typeof expenses = [];
  let archivedExpenses: typeof expenses = [];
  let archivedIncomes: typeof expenses = [];

  try {
    await ensureMonthSnapshot(selectedMonth.key);

    const [categories, monthTransactions] = await Promise.all([
      prisma.monthCategory.findMany({
        where: { month: { key: selectedMonth.key } },
        include: { templateCategory: { select: { defaultBudgetAmount: true, defaultBudgetCurrency: true } } },
        orderBy: [{ sortOrder: "asc" }, { id: "asc" }],
      }),
      prisma.transaction.findMany({
        where: {
          date: { gte: startOfMonth, lte: endOfMonth },
        },
        select: { amount: true, monthCategoryId: true, currency: true, type: true },
      }),
    ]);

    const monthlyTotals = categories.reduce<Record<number, { total: number; currency: string }>>((acc, category) => {
      acc[category.id] = { total: 0, currency: "SGD" };
      return acc;
    }, {});

    for (const transaction of monthTransactions) {
      const category = categories.find((item) => item.id === transaction.monthCategoryId);
      if (!category || transaction.type !== category.type) {
        continue;
      }

      const existing = monthlyTotals[category.id] ?? { total: 0, currency: transaction.currency };
      monthlyTotals[category.id] = {
        total: existing.total + transaction.amount,
        currency: existing.currency || transaction.currency,
      };
    }

    const withMonthlyTotals = categories.map((category) => ({
      ...category,
      monthlyTotal: monthlyTotals[category.id]?.total ?? 0,
      monthlyCurrency: monthlyTotals[category.id]?.currency ?? "SGD",
      monthlyBudget: category.budgetAmount ?? 0,
      monthlyBudgetCurrency: category.budgetCurrency ?? "SGD",
      defaultBudgetAmount: category.templateCategory.defaultBudgetAmount ?? 0,
      defaultBudgetCurrency: category.templateCategory.defaultBudgetCurrency ?? "SGD",
    }));

    const toCategoryCard = (category: (typeof withMonthlyTotals)[number]) => ({
      id: category.id,
      name: category.name,
      type: category.type,
      icon: category.icon,
      sortOrder: category.sortOrder,
      monthlyTotal: category.monthlyTotal,
      monthlyCurrency: category.monthlyCurrency,
      monthlyBudget: category.monthlyBudget,
      monthlyBudgetCurrency: category.monthlyBudgetCurrency,
      defaultBudgetAmount: category.defaultBudgetAmount,
      defaultBudgetCurrency: category.defaultBudgetCurrency,
    });

    expenses = withMonthlyTotals.filter((category) => !category.archived && category.type === "Expense").map(toCategoryCard);
    incomes = withMonthlyTotals.filter((category) => !category.archived && category.type === "Income").map(toCategoryCard);
    archivedExpenses = withMonthlyTotals.filter((category) => category.archived && category.type === "Expense").map(toCategoryCard);
    archivedIncomes = withMonthlyTotals.filter((category) => category.archived && category.type === "Income").map(toCategoryCard);
  } catch (error) {
    console.error("Failed to load categories:", error);
    return (
      <div className="space-y-5">
        <PageHeader breadcrumbs={[{ label: "Overview", href: "/" }, { label: "Categories" }]} title="Categories" description="Manage your categories and monthly budgets from one globally synced view." />
        <div className="rounded-lg border border-amber-300 bg-amber-50 p-4 text-sm text-amber-800">Unable to load categories right now. Please make sure the Vercel environment variable DATABASE_URL points to a reachable PostgreSQL database.</div>
      </div>
    );
  }

  return (
    <div className="space-y-7">
      <PageHeader
        breadcrumbs={[{ label: "Overview", href: "/" }, { label: "Categories" }]}
        title="Categories"
        description="Manage your categories and monthly budgets from one globally synced view."
      />

      <CategoriesBoard
        expenses={expenses}
        incomes={incomes}
        archivedExpenses={archivedExpenses}
        archivedIncomes={archivedIncomes}
        selectedMonthKey={selectedMonth.key}
        selectedMonthLabel={formatMonthLabel(selectedMonth.year, selectedMonth.month)}
      />
    </div>
  );
}
