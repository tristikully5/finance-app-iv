import { prisma } from "@/lib/prisma";
import { buildMonthKey } from "@/lib/budgets";
import { ensureMonthSnapshot } from "@/lib/month-snapshots";
import PageHeader from "@/components/PageHeader";

export const dynamic = "force-dynamic";

function formatCurrency(value: number, currency = "SGD") {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
}

function formatCompactCurrency(value: number, currency = "SGD") {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
}

export default async function Home() {
  try {
    const now = new Date();
    const currentMonthKey = buildMonthKey(now.getFullYear(), now.getMonth() + 1);
    await ensureMonthSnapshot(currentMonthKey);

    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);

    const [transactions, monthCategories] = await Promise.all([
      prisma.transaction.findMany({
        where: {
          date: {
            gte: monthStart,
            lte: monthEnd,
          },
        },
        select: {
          amount: true,
          type: true,
          currency: true,
          monthCategoryId: true,
          date: true,
          name: true,
          account: { select: { name: true, icon: true } },
          toAccount: { select: { name: true, icon: true } },
        },
      }),
      prisma.monthCategory.findMany({
        where: { month: { key: currentMonthKey }, archived: false },
        orderBy: [{ sortOrder: "asc" }, { id: "asc" }],
        include: {
          transactions: { select: { amount: true, type: true, name: true, currency: true, date: true } },
        },
      }),
    ]);

    const expenseCategories = monthCategories
      .filter((category) => category.type === "Expense")
      .map((category) => {
        const spent = category.transactions.reduce((sum, transaction) => sum + (transaction.type === "Expense" ? Math.abs(transaction.amount) : 0), 0);
        const progress = category.budgetAmount > 0 ? Math.min(Math.round((spent / category.budgetAmount) * 100), 100) : 0;
        return {
          id: category.id,
          name: category.name,
          budget: category.budgetAmount,
          spent,
          progress,
          currency: category.budgetCurrency || "SGD",
        };
      })
      .sort((a, b) => b.spent - a.spent);

    const incomeCategories = monthCategories
      .filter((category) => category.type === "Income")
      .map((category) => {
        const received = category.transactions.reduce((sum, transaction) => sum + (transaction.type === "Income" ? Math.abs(transaction.amount) : 0), 0);
        return {
          id: category.id,
          name: category.name,
          budget: category.budgetAmount,
          received,
          currency: category.budgetCurrency || "SGD",
        };
      })
      .sort((a, b) => b.received - a.received);

    const totalSpent = expenseCategories.reduce((sum, category) => sum + category.spent, 0);
    const totalBudget = expenseCategories.reduce((sum, category) => sum + category.budget, 0);
    const totalIncome = transactions.filter((transaction) => transaction.type === "Income").reduce((sum, transaction) => sum + Math.abs(transaction.amount), 0);
    const remaining = totalIncome - totalSpent;
    const progress = totalBudget > 0 ? Math.min(Math.round((totalSpent / totalBudget) * 100), 100) : 0;

    const iconMap = [
      "bg-rose-50 text-rose-600",
      "bg-amber-50 text-amber-600",
      "bg-cyan-50 text-cyan-600",
      "bg-violet-50 text-violet-600",
      "bg-emerald-50 text-emerald-600",
      "bg-blue-50 text-blue-600",
    ];

    return (
      <div className="space-y-5">
        <PageHeader
          breadcrumbs={[{ label: "Overview" }]}
          title="Overview"
          description="Your monthly financial snapshot."
          actions={
            <button type="button" className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-[11px] font-semibold text-slate-700 shadow-sm transition hover:border-slate-300">
              <svg viewBox="0 0 24 24" aria-hidden="true" className="h-3.5 w-3.5 fill-none stroke-current stroke-2">
                <path d="M4 12.5v7A1.5 1.5 0 0 0 5.5 21h13A1.5 1.5 0 0 0 20 19.5v-7M12 3v11M8.5 7.5 12 4l3.5 3.5" />
              </svg>
              Edit budget
            </button>
          }
        />

        <div className="grid gap-5 xl:grid-cols-[1.65fr_1fr]">
          <div className="space-y-5">
            <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">Total spent</p>
                  <p className="mt-3 text-4xl font-bold tracking-tight text-slate-950">{formatCurrency(totalSpent)}</p>
                </div>
                <div className="min-w-[160px] text-right">
                  <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">Total budget</p>
                  <p className="mt-3 text-sm font-semibold text-slate-800">{formatCurrency(totalBudget)}</p>
                </div>
              </div>

              <div className="mt-4">
                <div className="mb-2 flex items-center justify-between text-[11px] text-slate-500">
                  <span>Progress</span>
                  <span>{progress}%</span>
                </div>
                <div className="h-2.5 w-full overflow-hidden rounded-full bg-slate-200">
                  <div className="h-full rounded-full bg-violet-500" style={{ width: `${Math.min(progress, 100)}%` }} />
                </div>
              </div>

              <p className="mt-4 text-xs text-slate-500">
                {formatCurrency(totalSpent)} of {formatCurrency(totalBudget)} used
              </p>
            </section>

            <section className="rounded-xl border border-slate-200 bg-white shadow-sm">
              <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3">
                <h2 className="text-[15px] font-bold text-slate-950">Expenses</h2>
              </div>

              <div className="overflow-hidden">
                <div className="grid grid-cols-[minmax(0,1fr)_6.5rem_6.5rem_7rem] gap-3 border-b border-slate-100 bg-slate-50 px-4 py-3 text-[10px] font-semibold uppercase tracking-wide text-slate-500">
                  <span>Category</span>
                  <span>Budget</span>
                  <span>Spent</span>
                  <span>Progress</span>
                </div>

                {expenseCategories.length === 0 ? (
                  <div className="px-4 py-10 text-center text-sm text-slate-500">No expense categories available for this month.</div>
                ) : (
                  expenseCategories.map((category, index) => (
                    <div key={category.id} className="grid grid-cols-[minmax(0,1fr)_6.5rem_6.5rem_7rem] items-center gap-3 border-b border-slate-100 px-4 py-3 text-[12px] last:border-b-0">
                      <div className="flex min-w-0 items-center gap-2.5">
                        <span className={`flex h-7 w-7 items-center justify-center rounded-md ${iconMap[index % iconMap.length]}`}>
                          <svg viewBox="0 0 24 24" aria-hidden="true" className="h-3.5 w-3.5 fill-none stroke-current stroke-2">
                            <path d="M5 12h14M12 5v14" />
                          </svg>
                        </span>
                        <span className="truncate font-medium text-slate-800">{category.name}</span>
                      </div>
                      <span className="text-slate-700">{formatCurrency(category.budget, category.currency)}</span>
                      <span className="text-slate-700">{formatCurrency(category.spent, category.currency)}</span>
                      <div className="flex items-center gap-2">
                        <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-200">
                          <div className="h-full rounded-full bg-red-500" style={{ width: `${Math.min(category.progress, 100)}%` }} />
                        </div>
                        <span className="w-8 text-right text-[10px] font-semibold text-slate-600">{Math.min(category.progress, 100)}%</span>
                      </div>
                    </div>
                  ))
                )}
              </div>

              <button type="button" className="flex items-center gap-2 border-t border-slate-200 px-4 py-3 text-[11px] font-semibold text-slate-700 transition hover:bg-slate-50">
                <span className="flex h-5 w-5 items-center justify-center rounded-full border border-slate-300 text-base leading-none">+</span>
                Add expense category
              </button>
            </section>
          </div>

          <div className="space-y-5">
            <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
              <div className="flex items-center justify-between gap-3">
                <h2 className="text-[15px] font-bold text-slate-950">Income</h2>
                <button type="button" className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-[10px] font-semibold text-slate-700">
                  <svg viewBox="0 0 24 24" aria-hidden="true" className="h-3.5 w-3.5 fill-none stroke-current stroke-2"><path d="M4 12.5v7A1.5 1.5 0 0 0 5.5 21h13A1.5 1.5 0 0 0 20 19.5v-7M12 3v11M8.5 7.5 12 4l3.5 3.5" /></svg>
                  Edit budget
                </button>
              </div>

              <div className="mt-4 overflow-hidden rounded-lg border border-slate-200">
                <div className="grid grid-cols-[minmax(0,1fr)_6rem_6rem] gap-3 border-b border-slate-100 bg-slate-50 px-3 py-2 text-[10px] font-semibold uppercase tracking-wide text-slate-500">
                  <span>Category</span>
                  <span>Budget</span>
                  <span>Received</span>
                </div>
                {incomeCategories.length === 0 ? (
                  <div className="px-3 py-6 text-center text-sm text-slate-500">No income categories for this month.</div>
                ) : (
                  incomeCategories.map((category, index) => (
                    <div key={category.id} className="grid grid-cols-[minmax(0,1fr)_6rem_6rem] items-center gap-3 border-b border-slate-100 px-3 py-3 text-[12px] last:border-b-0">
                      <div className="flex min-w-0 items-center gap-2.5">
                        <span className={`flex h-7 w-7 items-center justify-center rounded-md ${iconMap[(index + 2) % iconMap.length]}`}>
                          <svg viewBox="0 0 24 24" aria-hidden="true" className="h-3.5 w-3.5 fill-none stroke-current stroke-2"><path d="M12 5v14M5 12h14" /></svg>
                        </span>
                        <span className="truncate font-medium text-slate-800">{category.name}</span>
                      </div>
                      <span className="text-slate-700">{formatCurrency(category.budget, category.currency)}</span>
                      <span className="text-right font-semibold text-emerald-700">{formatCurrency(category.received, category.currency)}</span>
                    </div>
                  ))
                )}
              </div>
            </section>

            <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
              <h2 className="text-[15px] font-bold text-slate-950">Summary</h2>

              <div className="mt-4 space-y-3 text-sm text-slate-700">
                <div className="flex items-center justify-between border-b border-slate-200 pb-3">
                  <span>Total budget</span>
                  <span className="font-semibold text-slate-900">{formatCurrency(totalBudget)}</span>
                </div>
                <div className="flex items-center justify-between border-b border-slate-200 pb-3">
                  <span>Total spent</span>
                  <span className="font-semibold text-slate-900">{formatCurrency(totalSpent)}</span>
                </div>
                <div className="flex items-center justify-between border-b border-slate-200 pb-3">
                  <span>Income received</span>
                  <span className="font-semibold text-emerald-700">{formatCurrency(totalIncome)}</span>
                </div>
                <div className="flex items-center justify-between rounded-lg bg-emerald-50 px-3 py-2.5 text-emerald-700">
                  <span className="font-medium">Remaining</span>
                  <span className="font-bold">{formatCurrency(remaining)}</span>
                </div>
              </div>
            </section>
          </div>
        </div>
      </div>
    );
  } catch (error) {
    console.error("Failed to load dashboard:", error);
    return (
      <div className="space-y-5">
        <PageHeader breadcrumbs={[{ label: "Overview" }]} title="Overview" description="Your monthly financial snapshot." />
        <div className="rounded-lg border border-amber-300 bg-amber-50 p-4 text-sm text-amber-800">Unable to load the dashboard right now. Please make sure your database environment variable (DATABASE_URL or Vercel Postgres URL variables) points to a reachable PostgreSQL database.</div>
      </div>
    );
  }
}
