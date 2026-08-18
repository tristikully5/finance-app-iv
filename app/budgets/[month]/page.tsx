import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { buildMonthKey, parseMonthValue } from "@/lib/budgets";
import { ensureMonthSnapshot } from "@/lib/month-snapshots";
import BudgetOverview, { type BudgetOverviewCategory } from "@/components/BudgetOverview";
import PageHeader from "@/components/PageHeader";

export const dynamic = "force-dynamic";

export default async function BudgetMonthPage({ params }: { params: Promise<{ month: string }> }) {
  const { month: monthKey } = await params;
  if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(monthKey)) notFound();

  const selectedMonth = parseMonthValue(monthKey);
  const startOfMonth = new Date(selectedMonth.year, selectedMonth.month - 1, 1);
  const endOfMonth = new Date(selectedMonth.year, selectedMonth.month, 0, 23, 59, 59, 999);
  let categories: BudgetOverviewCategory[] = [];

  try {
    const currentMonthKey = buildMonthKey(new Date().getFullYear(), new Date().getMonth() + 1);
    await Promise.all([ensureMonthSnapshot(monthKey), ensureMonthSnapshot(currentMonthKey)]);
    const [monthCategories, currentMonthCategories, monthTransactions] = await Promise.all([
      prisma.monthCategory.findMany({
        where: { month: { key: monthKey } },
        orderBy: [{ sortOrder: "asc" }, { id: "asc" }],
      }),
      prisma.monthCategory.findMany({
        where: { month: { key: currentMonthKey }, archived: false },
        select: { templateCategoryId: true },
      }),
      prisma.transaction.findMany({
        where: { date: { gte: startOfMonth, lte: endOfMonth } },
        select: { amount: true, monthCategoryId: true, currency: true },
      }),
    ]);

    const activeTemplateIds = new Set(currentMonthCategories.map((category) => category.templateCategoryId));
    const totals = monthTransactions.reduce<Record<number, { amount: number; currency: string }>>((result, transaction) => {
      const current = result[transaction.monthCategoryId] ?? { amount: 0, currency: transaction.currency || "SGD" };
      result[transaction.monthCategoryId] = { amount: current.amount + transaction.amount, currency: current.currency };
      return result;
    }, {});

    categories = monthCategories.map((category) => ({
      id: category.id,
      name: category.name,
      type: category.type,
      icon: category.icon,
      monthlyTotal: totals[category.id]?.amount ?? 0,
      monthlyCurrency: totals[category.id]?.currency ?? category.budgetCurrency ?? "SGD",
      monthlyBudget: category.budgetAmount ?? 0,
      monthlyBudgetCurrency: category.budgetCurrency ?? "SGD",
      isActive: !category.archived && activeTemplateIds.has(category.templateCategoryId),
    }));
  } catch (error) {
    console.error("Failed to load budget month:", error);
    return (
      <div className="space-y-5">
        <PageHeader breadcrumbs={[{ label: "Overview", href: "/" }, { label: "Budgets", href: "/budgets" }, { label: monthKey }]} title={monthKey} description={`Budget overview for ${monthKey}.`} />
        <div className="rounded-lg border border-amber-300 bg-amber-50 p-4 text-sm text-amber-800">Unable to load this budget month right now. Please try again.</div>
      </div>
    );
  }

  const monthLabel = new Intl.DateTimeFormat("en-US", { month: "long", year: "numeric" }).format(new Date(selectedMonth.year, selectedMonth.month - 1, 1));
  const expenses = categories.filter((category) => category.type === "Expense");
  const incomes = categories.filter((category) => category.type === "Income");
  const currency = categories[0]?.monthlyBudgetCurrency ?? "SGD";

  return (
    <div className="space-y-5">
      <PageHeader
        breadcrumbs={[{ label: "Overview", href: "/" }, { label: "Budgets", href: "/budgets" }, { label: monthLabel }]}
        title={monthLabel}
        description={`Budget overview for ${monthKey}.`}
        actions={<div className="flex h-8 items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 text-[11px] font-semibold text-slate-700 shadow-sm"><svg aria-hidden="true" viewBox="0 0 24 24" className="h-3.5 w-3.5 fill-none stroke-current stroke-2"><rect x="3" y="5" width="18" height="16" rx="2" /><path d="M8 3v4M16 3v4M3 10h18" /></svg>{monthKey}</div>}
      />

      <BudgetOverview expenses={expenses} incomes={incomes} monthKey={monthKey} currency={currency} />
    </div>
  );
}
