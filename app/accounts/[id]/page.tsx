import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import AccountEditDialog from "@/components/AccountEditDialog";
import IconDisplay from "@/components/IconDisplay";
import PageHeader from "@/components/PageHeader";
import { defaultIconValue } from "@/lib/icon-options";

export const dynamic = "force-dynamic";

type AccountDetailPageProps = {
  params: Promise<{ id: string }>;
};

function formatCurrency(value: number, currency: string) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: currency || "USD",
  }).format(value);
}

function formatDate(value: Date) {
  return new Intl.DateTimeFormat("en-US", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(value);
}

function transactionDelta(transaction: { amount: number; type: string; accountId: number; toAccountId: number | null }, accountId: number) {
  if (transaction.type === "Income") return transaction.accountId === accountId ? transaction.amount : 0;
  if (transaction.type === "Expense") return transaction.accountId === accountId ? -transaction.amount : 0;
  if (transaction.toAccountId === accountId) return transaction.amount;
  return transaction.accountId === accountId ? -transaction.amount : 0;
}

export default async function AccountDetailPage({ params }: AccountDetailPageProps) {
  const accountId = Number((await params).id);
  if (!Number.isInteger(accountId)) notFound();

  const account = await prisma.account.findUnique({
    where: { id: accountId },
    include: {
      transactions: { include: { monthCategory: true }, orderBy: { date: "desc" } },
      incomingTransfers: { include: { monthCategory: true }, orderBy: { date: "desc" } },
    },
  });

  if (!account || account.archived) notFound();

  const transactions = [...account.transactions, ...account.incomingTransfers].sort((a, b) => b.date.getTime() - a.date.getTime());
  const chronologicalTransactions = [...transactions].sort((a, b) => a.date.getTime() - b.date.getTime());
  let runningBalance = 0;
  const balanceByTransaction = new Map<number, number>();

  for (const transaction of chronologicalTransactions) {
    runningBalance += transactionDelta(transaction, account.id);
    balanceByTransaction.set(transaction.id, runningBalance);
  }

  const actualBalance = runningBalance;
  const reservedBalance = account.transactions.reduce((total, transaction) => total + (transaction.type === "Transfer" && transaction.goalId ? transaction.amount : 0), 0);
  const availableBalance = actualBalance - reservedBalance;
  const currency = account.currency || "USD";
  const transactionTotal = transactions.reduce((total, transaction) => total + Math.abs(transactionDelta(transaction, account.id)), 0);
  const monthlyAverage = transactions.length > 0 ? transactionTotal / Math.max(1, new Set(transactions.map((transaction) => `${transaction.date.getFullYear()}-${transaction.date.getMonth()}`)).size) : 0;
  const highestBalance = Math.max(0, ...Array.from(balanceByTransaction.values()));
  const lowestBalance = Math.min(0, ...Array.from(balanceByTransaction.values()));
  const balanceLimit = Math.max(Math.abs(actualBalance), Math.abs(availableBalance), 1);

  return (
    <div className="space-y-5">
      <PageHeader
        breadcrumbs={[{ label: "Overview", href: "/" }, { label: "Accounts", href: "/accounts" }, { label: account.name }]}
        title={account.name}
        description={`${account.type} • ${account.currency}`}
        leading={<span className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-100"><IconDisplay icon={account.icon || defaultIconValue} className="h-5 w-5 object-contain" /></span>}
        actions={<AccountEditDialog account={{ id: account.id, name: account.name, type: account.type, currency: account.currency, icon: account.icon || defaultIconValue }} />}
      />

      <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="grid gap-6 md:grid-cols-[1.25fr_0.75fr]">
          <div className="border-b border-slate-200 pb-5 md:border-b-0 md:border-r md:pb-0 md:pr-6">
            <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">Available</p>
            <p className="mt-3 text-2xl font-bold tracking-tight text-slate-950">{formatCurrency(availableBalance, currency)}</p>
            <div className="mt-4 flex items-center gap-2"><progress className="account-progress account-progress-available" value={Math.abs(availableBalance)} max={balanceLimit} aria-label="Available balance" /><span className="text-[11px] text-slate-500">of {formatCurrency(balanceLimit, currency)} limit</span></div>
            {reservedBalance > 0 ? <div className="mt-5 flex items-start justify-between rounded-xl bg-emerald-50 px-3 py-2.5 text-xs text-emerald-700"><span className="flex items-start gap-2"><IconDisplay icon={account.icon || defaultIconValue} className="mt-0.5 h-4 w-4 object-contain" /><span><strong>{formatCurrency(reservedBalance, currency)} saved</strong><span className="block mt-0.5 text-[11px]">Nice! You&apos;ve saved {formatCurrency(reservedBalance, currency)} so far.</span></span></span><span className="mt-1 text-lg">›</span></div> : null}
          </div>
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">Actual balance</p>
            <p className="mt-3 text-2xl font-bold tracking-tight text-slate-950">{formatCurrency(actualBalance, currency)}</p>
            <progress className="account-progress account-progress-actual mt-5" value={Math.abs(actualBalance)} max={balanceLimit} aria-label="Actual balance" />
            <p className="mt-4 text-[11px] text-slate-500">Updated just now&nbsp; ↻</p>
          </div>
        </div>
      </section>

      <div className="grid gap-4 md:grid-cols-3">
        <StatCard label="Monthly average" value={formatCurrency(monthlyAverage, currency)} detail="Based on recorded activity" accent="emerald" />
        <StatCard label="Highest balance" value={formatCurrency(highestBalance, currency)} detail="Peak recorded balance" accent="violet" />
        <StatCard label="Lowest balance" value={formatCurrency(lowestBalance, currency)} detail="Lowest recorded balance" accent="rose" />
      </div>

      <section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 px-4 py-4">
          <h2 className="text-sm font-bold text-slate-950">Transactions</h2>
          <div className="flex items-center gap-2"><button type="button" className="rounded-lg border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-700">⌕ &nbsp;Search transactions...</button><button type="button" className="rounded-lg bg-slate-950 px-3 py-2 text-xs font-semibold text-white">＋ &nbsp;Add transaction</button></div>
        </div>
        {transactions.length === 0 ? <p className="p-8 text-center text-sm text-slate-500">No transactions for this account yet.</p> : <div className="overflow-x-auto"><div className="min-w-[680px]"><div className="grid grid-cols-[7.5rem_minmax(12rem,1.6fr)_minmax(8rem,1fr)_8rem_8rem] border-b border-slate-100 bg-slate-50 px-4 py-3 text-[10px] font-semibold uppercase tracking-wide text-slate-500"><span>Date</span><span>Description</span><span>Category</span><span className="text-right">Amount</span><span className="text-right">Balance</span></div>{transactions.map((transaction) => { const delta = transactionDelta(transaction, account.id); const isIncome = delta >= 0; return <div key={`${transaction.id}-${transaction.toAccountId ?? "from"}`} className="grid grid-cols-[7.5rem_minmax(12rem,1.6fr)_minmax(8rem,1fr)_8rem_8rem] items-center border-b border-slate-100 px-4 py-3 text-xs last:border-b-0"><span className="text-slate-500">{formatDate(transaction.date)}</span><span className="min-w-0"><strong className="block truncate text-slate-900">{transaction.name}</strong><small className="text-slate-500">{transaction.type === "Transfer" ? "Transfer" : transaction.monthCategory.name}</small></span><span className="text-slate-700">{transaction.type === "Transfer" ? "Transfer" : transaction.monthCategory.name}</span><span className={`text-right font-semibold ${isIncome ? "text-emerald-600" : "text-rose-600"}`}>{isIncome ? "+" : "-"}{formatCurrency(Math.abs(delta), currency)}</span><span className="text-right font-semibold text-slate-900">{formatCurrency(balanceByTransaction.get(transaction.id) ?? 0, currency)}</span></div>; })}</div></div>}
        <div className="border-t border-slate-200 px-4 py-3"><Link href="/transactions" className="text-xs font-semibold text-blue-700 hover:text-blue-900">View all transactions&nbsp; ›</Link></div>
      </section>
    </div>
  );
}

function StatCard({ label, value, detail, accent }: { label: string; value: string; detail: string; accent: "emerald" | "violet" | "rose" }) {
  const iconClass = accent === "emerald" ? "bg-emerald-50 text-emerald-600" : accent === "violet" ? "bg-violet-50 text-violet-600" : "bg-rose-50 text-rose-600";
  return <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm"><div className="flex items-start gap-3"><span className={`flex h-8 w-8 items-center justify-center rounded-lg text-sm ${iconClass}`}>◷</span><div><p className="text-[11px] font-medium text-slate-500">{label}</p><p className="mt-2 text-base font-bold text-slate-950">{value}</p><p className="mt-1 text-[10px] text-slate-500">{detail}</p></div></div></div>;
}
