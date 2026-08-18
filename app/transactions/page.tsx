import { prisma } from "@/lib/prisma";
import { buildMonthKey, formatMonthLabel, parseMonthValue } from "@/lib/budgets";
import TransactionsTable from "@/components/TransactionsTable";
import { ensureMonthSnapshot } from "@/lib/month-snapshots";
import PageHeader from "@/components/PageHeader";

export const dynamic = "force-dynamic";

export default async function TransactionsPage({ searchParams }: { searchParams?: Promise<{ month?: string }> }) {
  const params = await searchParams;
  const monthValue = params?.month ?? buildMonthKey(new Date().getFullYear(), new Date().getMonth() + 1);
  const selectedMonth = parseMonthValue(monthValue);
  const startOfMonth = new Date(selectedMonth.year, selectedMonth.month - 1, 1);
  const endOfMonth = new Date(selectedMonth.year, selectedMonth.month, 0, 23, 59, 59, 999);
  const previousMonthDate = new Date(selectedMonth.year, selectedMonth.month - 2, 1);
  const nextMonthDate = new Date(selectedMonth.year, selectedMonth.month, 1);
  const previousMonthKey = buildMonthKey(previousMonthDate.getFullYear(), previousMonthDate.getMonth() + 1);
  const nextMonthKey = buildMonthKey(nextMonthDate.getFullYear(), nextMonthDate.getMonth() + 1);
  const todayMonthKey = buildMonthKey(new Date().getFullYear(), new Date().getMonth() + 1);

  let transactionsTableItems: Array<{
    id: number;
    date: string;
    name: string;
    description: string;
    tags: string[];
    amount: number;
    currency: string;
    type: string;
    accountId: number;
    toAccountId: number | null;
    goalId: number | null;
    monthCategoryId: number;
    account: { id: number; name: string; icon: string | null };
    toAccount: { id: number; name: string; icon: string | null } | null;
    goal: { id: number; name: string; icon: string | null } | null;
    category: { id: number; name: string; type: string; icon: string | null };
  }> = [];
  let accounts: Array<{ id: number; name: string; icon: string | null }> = [];
  let goals: Array<{ id: number; name: string; icon: string | null }> = [];
  let typedCategories: Array<{ id: number; name: string; type: string; icon: string | null }> = [];

  try {
    await ensureMonthSnapshot(selectedMonth.key);

    const [transactions, fetchedAccounts, fetchedCategories, fetchedGoals] = await Promise.all([
      prisma.transaction.findMany({
        where: {
          date: { gte: startOfMonth, lte: endOfMonth },
        },
        orderBy: { date: "desc" },
        select: {
          id: true,
          date: true,
          name: true,
          description: true,
          tags: true,
          amount: true,
          currency: true,
          type: true,
          accountId: true,
          toAccountId: true,
          goalId: true,
          monthCategoryId: true,
          account: { select: { id: true, name: true, icon: true } },
          monthCategory: { select: { id: true, name: true, type: true, icon: true } },
          goal: { select: { id: true, name: true, icon: true } },
        },
      }),
      prisma.account.findMany({ where: { archived: false }, orderBy: { createdAt: "desc" }, select: { id: true, name: true, icon: true } }),
      prisma.monthCategory.findMany({
        where: { month: { key: selectedMonth.key }, archived: false },
        orderBy: [{ sortOrder: "asc" }, { id: "asc" }],
      }),
      prisma.goal.findMany({ orderBy: { createdAt: "desc" }, select: { id: true, name: true, icon: true } }),
    ]);

    const accountsById = new Map(fetchedAccounts.map((account) => [account.id, account]));

    transactionsTableItems = transactions.map((transaction) => ({
      id: transaction.id,
      date: transaction.date.toISOString(),
      name: transaction.name,
      description: transaction.description ?? "",
      tags: transaction.tags ?? [],
      amount: transaction.amount,
      currency: transaction.currency,
      type: transaction.type,
      accountId: transaction.accountId,
      toAccountId: transaction.toAccountId,
      goalId: transaction.goalId,
      monthCategoryId: transaction.monthCategoryId,
      account: { id: transaction.account.id, name: transaction.account.name, icon: transaction.account.icon ?? null },
      toAccount:
        transaction.toAccountId && accountsById.get(transaction.toAccountId)
          ? {
              id: accountsById.get(transaction.toAccountId)!.id,
              name: accountsById.get(transaction.toAccountId)!.name,
              icon: accountsById.get(transaction.toAccountId)!.icon ?? null,
            }
          : null,
      goal: transaction.goal ? { id: transaction.goal.id, name: transaction.goal.name, icon: transaction.goal.icon } : null,
      category: {
        id: transaction.monthCategory.id,
        name: transaction.monthCategory.name,
        type: transaction.monthCategory.type,
        icon: transaction.monthCategory.icon,
      },
    }));
    accounts = fetchedAccounts.map((account) => ({ id: account.id, name: account.name, icon: account.icon ?? null }));
    goals = fetchedGoals;
    typedCategories = fetchedCategories.map((category) => ({ id: category.id, name: category.name, type: category.type, icon: category.icon }));
  } catch (error) {
    console.error("Failed to load transactions:", error);
    return (
      <div className="space-y-5">
        <PageHeader breadcrumbs={[{ label: "Overview", href: "/" }, { label: "Transactions" }]} title="Transactions" description="Track daily activity for the selected month." />
        <div className="rounded-lg border border-amber-300 bg-amber-50 p-4 text-sm text-amber-800">Unable to load transactions right now. Please make sure the Vercel environment variable DATABASE_URL points to a reachable PostgreSQL database.</div>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <PageHeader
        breadcrumbs={[{ label: "Overview", href: "/" }, { label: "Transactions" }]}
        title="Transactions"
        description="Track daily activity for the selected month."
      />

      <TransactionsTable
        transactions={transactionsTableItems}
        accounts={accounts}
        categories={typedCategories}
        goals={goals}
        monthLabel={formatMonthLabel(selectedMonth.year, selectedMonth.month)}
        monthKey={selectedMonth.key}
        previousMonthKey={previousMonthKey}
        nextMonthKey={nextMonthKey}
        todayMonthKey={todayMonthKey}
      />
    </div>
  );
}
