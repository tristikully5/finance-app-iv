import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { buildMonthKey, parseMonthValue } from "@/lib/budgets";
import NewMonthDialog from "@/components/NewMonthDialog";
import PageHeader from "@/components/PageHeader";

export const dynamic = "force-dynamic";

type BudgetMonth = {
  key: string;
  label: string;
  range: string;
  netBalance: number;
  currency: string;
};

function formatCurrency(value: number, currency: string) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: currency || "SGD" }).format(value);
}

function formatMonthName(key: string) {
  const [year, month] = key.split("-").map(Number);
  return new Date(year, month - 1, 1).toLocaleDateString("en-US", { month: "long", year: "numeric" });
}

function formatMonthRange(key: string) {
  const [year, month] = key.split("-").map(Number);
  const start = new Date(year, month - 1, 1);
  const end = new Date(year, month, 0);
  const formatDate = (date: Date) => date.toLocaleDateString("en-US", { day: "numeric", month: "short", year: "numeric" });
  return `${formatDate(start)} – ${formatDate(end)}`;
}

function transactionNetBalance(amount: number, type: string) {
  if (type === "Income") return Math.abs(amount);
  if (type === "Expense") return -Math.abs(amount);
  return 0;
}

export default async function BudgetsPage({ searchParams }: { searchParams?: Promise<{ year?: string }> }) {
  const params = await searchParams;
  const now = new Date();
  const currentMonthKey = buildMonthKey(now.getFullYear(), now.getMonth() + 1);
  const parsedCurrentMonth = parseMonthValue(currentMonthKey);
  const requestedYear = Number(params?.year);
  const selectedYear = Number.isInteger(requestedYear) && requestedYear >= 2000 && requestedYear <= 2100 ? requestedYear : parsedCurrentMonth.year;
  const yearStart = new Date(selectedYear, 0, 1);
  const yearEnd = new Date(selectedYear, 11, 31, 23, 59, 59, 999);

  const [months, transactions] = await Promise.all([
    prisma.month.findMany({ where: { key: { startsWith: `${selectedYear}-` } }, orderBy: { key: "desc" } }),
    prisma.transaction.findMany({ where: { date: { gte: yearStart, lte: yearEnd } }, select: { date: true, amount: true, currency: true, type: true } }),
  ]);

  const totalsByMonth = transactions.reduce<Record<string, { netBalance: number; currency: string }>>((totals, transaction) => {
    const key = transaction.date.toISOString().slice(0, 7);
    const current = totals[key] ?? { netBalance: 0, currency: transaction.currency || "SGD" };
    totals[key] = {
      netBalance: current.netBalance + transactionNetBalance(transaction.amount, transaction.type),
      currency: current.currency,
    };
    return totals;
  }, {});

  const budgetMonths: BudgetMonth[] = months.map((month) => ({
    key: month.key,
    label: formatMonthName(month.key),
    range: formatMonthRange(month.key),
    netBalance: totalsByMonth[month.key]?.netBalance ?? 0,
    currency: totalsByMonth[month.key]?.currency ?? "SGD",
  }));

  const previousYear = selectedYear - 1;
  const nextYear = selectedYear + 1;
  const defaultNewMonth = selectedYear === parsedCurrentMonth.year ? currentMonthKey : buildMonthKey(selectedYear, 1);

  return (
    <div className="space-y-7">
      <PageHeader
        breadcrumbs={[{ label: "Overview", href: "/" }, { label: "Budgets" }]}
        title="Budgets"
        description="Browse your monthly budget snapshots."
        actions={<><NewMonthDialog defaultMonth={defaultNewMonth} /><button type="button" className="flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-500 transition hover:bg-slate-50" aria-label="More budget actions">···</button></>}
      />

      <div className="flex justify-center">
        <div className="inline-flex h-9 items-center overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
          <Link href={`/budgets?year=${previousYear}`} className="flex h-full w-10 items-center justify-center text-lg text-slate-500 transition hover:bg-slate-50" aria-label={`Show ${previousYear}`}>‹</Link>
          <div className="flex h-full min-w-28 items-center justify-center gap-2 border-x border-slate-100 px-4 text-sm font-semibold text-slate-800"><span>{selectedYear}</span><svg aria-hidden="true" viewBox="0 0 24 24" className="h-3.5 w-3.5 fill-none stroke-slate-500 stroke-2"><rect x="3" y="5" width="18" height="16" rx="2" /><path d="M8 3v4M16 3v4M3 10h18" /></svg></div>
          <Link href={`/budgets?year=${nextYear}`} className="flex h-full w-10 items-center justify-center text-lg text-slate-500 transition hover:bg-slate-50" aria-label={`Show ${nextYear}`}>›</Link>
        </div>
      </div>

      <section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        <div className="grid grid-cols-[minmax(0,1fr)_9rem_1.5rem] items-center border-b border-slate-100 px-4 py-3 text-[10px] font-semibold uppercase tracking-wide text-slate-500 sm:grid-cols-[minmax(0,1fr)_10rem_1.5rem]">
          <span>Month</span>
          <span>Net balance <span className="ml-1 inline-flex h-3.5 w-3.5 items-center justify-center rounded-full border border-slate-400 text-[9px] normal-case">i</span></span>
          <span />
        </div>
        {budgetMonths.length > 0 ? budgetMonths.map((month) => {
          const balanceClass = month.netBalance > 0 ? "text-emerald-600" : month.netBalance < 0 ? "text-rose-600" : "text-slate-600";
          return (
            <Link key={month.key} href={`/budgets/${month.key}`} className="grid grid-cols-[minmax(0,1fr)_9rem_1.5rem] items-center border-b border-slate-100 px-4 py-3.5 transition last:border-b-0 hover:bg-slate-50 sm:grid-cols-[minmax(0,1fr)_10rem_1.5rem]">
              <div className="flex min-w-0 items-center gap-3">
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-blue-50 text-blue-600"><svg aria-hidden="true" viewBox="0 0 24 24" className="h-4 w-4 fill-none stroke-current stroke-2"><rect x="3" y="5" width="18" height="16" rx="2" /><path d="M8 3v4M16 3v4M3 10h18" /></svg></span>
                <span className="min-w-0"><span className="block text-xs font-semibold text-slate-900">{month.label}</span><span className="mt-0.5 block text-[11px] text-slate-500">{month.range}</span></span>
              </div>
              <span className={`text-right text-xs font-semibold ${balanceClass}`}>{formatCurrency(month.netBalance, month.currency)}</span>
              <span className="text-right text-lg leading-none text-slate-500">›</span>
            </Link>
          );
        }) : <div className="px-4 py-12 text-center text-sm text-slate-500">No budget snapshots for {selectedYear}.</div>}
      </section>
    </div>
  );
}
