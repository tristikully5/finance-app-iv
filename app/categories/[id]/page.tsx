import Link from "next/link";
import { notFound } from "next/navigation";
import CategoryEditDialog from "@/components/CategoryEditDialog";
import IconDisplay from "@/components/IconDisplay";
import { prisma } from "@/lib/prisma";
import { buildMonthKey, parseMonthValue } from "@/lib/budgets";
import { ensureMonthSnapshot } from "@/lib/month-snapshots";
import PageHeader from "@/components/PageHeader";

export const dynamic = "force-dynamic";

type CategoryDetailPageProps = {
  params: Promise<{ id: string }>;
};

function formatCurrency(value: number, currency: string) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: currency || "SGD",
  }).format(value);
}

function formatDate(value: Date) {
  return new Intl.DateTimeFormat("en-US", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(value);
}

function formatMonth(value: string) {
  const { year, month } = parseMonthValue(value);
  return new Intl.DateTimeFormat("en-US", { month: "short", year: "numeric" }).format(new Date(year, month - 1, 1));
}

export default async function CategoryDetailPage({ params }: CategoryDetailPageProps) {
  const categoryId = Number((await params).id);
  if (!Number.isInteger(categoryId)) notFound();

  const currentMonthKey = buildMonthKey(new Date().getFullYear(), new Date().getMonth() + 1);
  await ensureMonthSnapshot(currentMonthKey);

  const category = await prisma.monthCategory.findFirst({
    where: { id: categoryId, month: { key: currentMonthKey }, archived: false },
    include: { month: true },
  });

  if (!category) notFound();

  const [historyCategories, categoryTransactions] = await Promise.all([
    prisma.monthCategory.findMany({
      where: { templateCategoryId: category.templateCategoryId, type: category.type, archived: false },
      include: { month: true },
    }),
    prisma.transaction.findMany({
      where: { monthCategoryId: category.id },
      orderBy: { date: "desc" },
      select: {
        id: true,
        date: true,
        name: true,
        amount: true,
        currency: true,
        type: true,
        accountId: true,
        monthCategoryId: true,
        account: { select: { name: true } },
      },
    }),
  ]);

  const historicalTransactions = await prisma.transaction.findMany({
    where: { monthCategory: { templateCategoryId: category.templateCategoryId } },
    select: { amount: true, monthCategoryId: true },
  });

  const totalsByCategory = historicalTransactions.reduce<Record<number, number>>((totals, transaction) => {
    totals[transaction.monthCategoryId] = (totals[transaction.monthCategoryId] ?? 0) + Math.abs(transaction.amount);
    return totals;
  }, {});

  const currentSpent = totalsByCategory[category.id] ?? 0;
  const isExpense = category.type === "Expense";
  const currency = category.budgetCurrency || "SGD";
  const budget = isExpense ? Math.max(category.budgetAmount, 0) : 0;
  const remaining = Math.max(budget - currentSpent, 0);
  const progress = budget > 0 ? Math.round((currentSpent / budget) * 100) : 0;
  const history = historyCategories
    .sort((a, b) => b.month.key.localeCompare(a.month.key))
    .slice(0, 5)
    .map((monthCategory) => {
      const spent = totalsByCategory[monthCategory.id] ?? 0;
      const monthBudget = isExpense ? Math.max(monthCategory.budgetAmount, 0) : 0;
      const spentPercent = monthBudget > 0 ? Math.round((spent / monthBudget) * 100) : 0;
      return {
        id: monthCategory.id,
        month: monthCategory.month.key,
        budget: monthBudget,
        spent,
        progress: Math.max(100 - spentPercent, 0),
        currency: monthCategory.budgetCurrency || currency,
      };
    });

  return (
    <div className="space-y-5">
      <PageHeader
        breadcrumbs={[{ label: "Overview", href: "/" }, { label: "Categories", href: "/categories" }, { label: category.name }]}
        title={category.name}
        description={`${category.type} category • Created on ${new Intl.DateTimeFormat("en-US", { day: "numeric", month: "short", year: "numeric" }).format(category.createdAt)}`}
        leading={<span className={`flex h-10 w-10 items-center justify-center rounded-xl ${isExpense ? "bg-rose-50" : "bg-emerald-50"}`}><IconDisplay icon={category.icon} className="h-5 w-5 object-contain" /></span>}
        actions={<><Link href={`/budgets/${currentMonthKey}`} className="flex h-8 items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 text-[11px] font-semibold text-slate-700 shadow-sm transition hover:border-slate-300"><svg aria-hidden="true" viewBox="0 0 24 24" className="h-3.5 w-3.5 fill-none stroke-current stroke-2"><rect x="3" y="5" width="18" height="16" rx="2" /><path d="M8 3v4M16 3v4M3 10h18" /></svg>{formatMonth(currentMonthKey)}</Link><CategoryEditDialog category={{ id: category.id, name: category.name, type: category.type, icon: category.icon, sortOrder: category.sortOrder, monthlyBudget: category.budgetAmount, monthlyBudgetCurrency: category.budgetCurrency }} /></>}
      />

      {isExpense ? (
        <>
          <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <MetricCard label="Spent this month" value={formatCurrency(currentSpent, currency)} detail="vs last month" accent="rose" />
            <MetricCard label="Monthly budget" value={formatCurrency(budget, currency)} detail={`Edit budget for ${formatMonth(currentMonthKey)}`} accent="blue" />
            <MetricCard label="Remaining" value={formatCurrency(remaining, currency)} detail="Left to budget" accent="emerald" />
            <MetricCard label="Budget progress" value={`${progress}%`} detail="of monthly budget" accent="violet" progress={Math.min(progress, 100)} />
          </section>

          <section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
            <div className="flex items-center justify-between border-b border-slate-200 px-4 py-4">
              <h2 className="text-sm font-bold text-slate-950">Budget history</h2>
              <Link href="/budgets" className="rounded-lg border border-slate-200 px-3 py-2 text-[10px] font-semibold text-slate-700 transition hover:bg-slate-50">View all months&nbsp; ›</Link>
            </div>
            <div className="overflow-x-auto">
              <div className="min-w-[620px]">
                <div className="grid grid-cols-[7rem_7rem_7rem_6rem] gap-3 bg-slate-50 px-4 py-3 text-[9px] font-semibold uppercase tracking-wide text-slate-500"><span>Month</span><span>Spent</span><span>Budget</span><span>Progress</span></div>
                {history.map((row) => (
                  <div key={row.id} className="grid grid-cols-[7rem_7rem_7rem_6rem] items-center gap-3 border-t border-slate-100 px-4 py-3 text-[11px]">
                    <Link href={`/budgets/${row.month}`} className="font-medium text-slate-800 hover:text-blue-700">{formatMonth(row.month)}</Link>
                    <span>{formatCurrency(row.spent, row.currency)}</span>
                    <span>{formatCurrency(row.budget, row.currency)}</span>
                    <span className="flex items-center gap-2"><span className="h-1.5 w-10 shrink-0 overflow-hidden rounded-full bg-slate-100"><span className={`block h-full rounded-full ${row.progress === 0 ? "bg-rose-500" : "bg-blue-500"}`} style={{ width: `${row.progress}%` }} /></span><span className="w-8 text-right text-[10px] text-slate-600">{row.progress}%</span></span>
                  </div>
                ))}
              </div>
            </div>
            <div className="border-t border-slate-200 px-4 py-3"><Link href="/budgets" className="text-xs font-semibold text-blue-700 hover:text-blue-900">View all months&nbsp; ›</Link></div>
          </section>
        </>
      ) : (
        <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">Received this month</p>
          <p className="mt-3 text-2xl font-bold tracking-tight text-emerald-600">{formatCurrency(currentSpent, currency)}</p>
          <p className="mt-2 text-xs text-slate-500">Income categories do not use budgets.</p>
        </section>
      )}

      <section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 px-4 py-4">
          <h2 className="text-sm font-bold text-slate-950">Transactions</h2>
          <Link href="/transactions" className="rounded-lg border border-slate-200 px-3 py-2 text-[10px] font-semibold text-slate-700 transition hover:bg-slate-50">View all transactions&nbsp; ›</Link>
        </div>
        {categoryTransactions.length === 0 ? <p className="p-8 text-center text-sm text-slate-500">No transactions for this category yet.</p> : (
          <div className="overflow-x-auto">
            <div className="min-w-[620px]">
              <div className="grid grid-cols-[7rem_minmax(14rem,1.6fr)_minmax(8rem,1fr)_7rem] border-b border-slate-100 bg-slate-50 px-4 py-3 text-[9px] font-semibold uppercase tracking-wide text-slate-500"><span>Date</span><span>Description</span><span>Account</span><span className="text-right">Amount</span></div>
              {categoryTransactions.slice(0, 5).map((transaction) => (
                <div key={transaction.id} className="grid grid-cols-[7rem_minmax(14rem,1.6fr)_minmax(8rem,1fr)_7rem] items-center border-b border-slate-100 px-4 py-3 text-xs last:border-b-0">
                  <span className="text-slate-500">{formatDate(transaction.date)}</span>
                  <span className="min-w-0"><strong className="block truncate text-slate-900">{transaction.name}</strong><small className="text-slate-500">{category.type === "Income" ? "Income" : "Expense"}</small></span>
                  <span className="truncate text-slate-700">{transaction.account.name}</span>
                  <span className={`text-right font-semibold ${category.type === "Income" ? "text-emerald-600" : "text-rose-600"}`}>{category.type === "Income" ? "+" : "-"}{formatCurrency(Math.abs(transaction.amount), transaction.currency || currency)}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </section>
    </div>
  );
}

function MetricCard({ label, value, detail, accent, progress }: { label: string; value: string; detail: string; accent: "rose" | "blue" | "emerald" | "violet"; progress?: number }) {
  const tone = accent === "rose" ? "bg-rose-50 text-rose-500" : accent === "blue" ? "bg-blue-50 text-blue-600" : accent === "emerald" ? "bg-emerald-50 text-emerald-600" : "bg-violet-50 text-violet-600";
  return <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm"><div className="flex items-start gap-3"><span className={`flex h-8 w-8 items-center justify-center rounded-lg ${tone}`}>◷</span><div className="min-w-0"><p className="text-[10px] font-medium text-slate-500">{label}</p><p className="mt-2 text-base font-bold text-slate-950">{value}</p>{progress === undefined ? <p className="mt-2 text-[10px] text-slate-500">{detail}</p> : <><div className="mt-2 h-1.5 overflow-hidden rounded-full bg-slate-100"><div className="h-full rounded-full bg-blue-600" style={{ width: `${progress}%` }} /></div><p className="mt-2 text-[10px] text-slate-500">{detail}</p></>}</div></div></div>;
}
