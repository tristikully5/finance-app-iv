import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import IconDisplay from "@/components/IconDisplay";
import PageHeader from "@/components/PageHeader";
import { defaultIconValue } from "@/lib/icon-options";

export const dynamic = "force-dynamic";

type GoalDetailPageProps = {
  params: Promise<{ id: string }>;
};

function formatCurrency(value: number, currency: string) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: currency || "SGD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
}

function formatDate(value: Date, options?: Intl.DateTimeFormatOptions) {
  return new Intl.DateTimeFormat("en-US", options ?? { day: "numeric", month: "short", year: "numeric" }).format(value);
}

function getProgress(amount: number, saved: number) {
  if (amount <= 0) return 0;
  return Math.min(Math.max(Math.round((saved / amount) * 100), 0), 100);
}

function getDaysLeft(targetDate?: Date | null) {
  if (!targetDate) return null;
  const diffMs = targetDate.getTime() - Date.now();
  const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
  return Math.max(diffDays, 0);
}

function MetricCard({ label, value, detail, accent }: { label: string; value: string; detail: string; accent: "emerald" | "violet" | "rose" | "slate" }) {
  const accentClasses = {
    emerald: "bg-emerald-50 text-emerald-700",
    violet: "bg-violet-50 text-violet-700",
    rose: "bg-rose-50 text-rose-700",
    slate: "bg-slate-100 text-slate-700",
  };

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className={`inline-flex rounded-full px-2 py-1 text-[10px] font-semibold ${accentClasses[accent]}`}>{label}</div>
      <p className="mt-3 text-2xl font-bold tracking-tight text-slate-950">{value}</p>
      <p className="mt-1 text-[11px] text-slate-500">{detail}</p>
    </div>
  );
}

export default async function GoalDetailPage({ params }: GoalDetailPageProps) {
  const goalId = Number((await params).id);
  if (!Number.isInteger(goalId)) notFound();

  const goal = await prisma.goal.findUnique({
    where: { id: goalId },
    include: {
      allocations: {
        orderBy: { date: "desc" },
        include: {
          account: { select: { id: true, name: true, icon: true } },
          toAccount: { select: { id: true, name: true, icon: true } },
        },
      },
    },
  });

  if (!goal) notFound();

  const transactions = goal.allocations ?? [];
  const totalAdded = transactions.reduce((sum, transaction) => sum + (transaction.amount > 0 ? transaction.amount : 0), 0);
  const totalUsed = transactions.reduce((sum, transaction) => sum + (transaction.amount < 0 ? Math.abs(transaction.amount) : 0), 0);
  const savedSoFar = Number(goal.amountUsed ?? (totalAdded - totalUsed));
  const remaining = Math.max(goal.amount - savedSoFar, 0);
  const progress = getProgress(goal.amount, savedSoFar);
  const targetDate = goal.targetDate ? new Date(goal.targetDate) : null;
  const daysLeft = getDaysLeft(targetDate);
  const createdDate = new Date(goal.createdAt);

  return (
    <div className="space-y-5">
      <PageHeader
        breadcrumbs={[{ label: "Overview", href: "/" }, { label: "Goals", href: "/goals" }, { label: goal.name }]}
        title={goal.name}
        description={goal.description || "Saving toward a goal."}
        leading={
          <span className="flex h-11 w-11 items-center justify-center rounded-full bg-emerald-50 ring-1 ring-emerald-100">
            <IconDisplay icon={goal.icon || defaultIconValue} className="h-6 w-6 object-contain" />
          </span>
        }
        actions={
          <button type="button" className="inline-flex h-9 items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 text-[11px] font-semibold text-slate-700 shadow-sm transition hover:border-slate-300">
            <svg viewBox="0 0 24 24" aria-hidden="true" className="h-3.5 w-3.5 fill-none stroke-current stroke-2">
              <path d="M4 12.5v7A1.5 1.5 0 0 0 5.5 21h13A1.5 1.5 0 0 0 20 19.5v-7M12 3v11M8.5 7.5 12 4l3.5 3.5" />
            </svg>
            Edit Goal
          </button>
        }
      />

      <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="grid gap-5 lg:grid-cols-[1.35fr_0.65fr]">
          <div className="flex items-center gap-4 border-b border-slate-200 pb-5 lg:border-b-0 lg:pb-0 lg:pr-5">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-[#dfeee9] shadow-inner ring-1 ring-emerald-200">
              <IconDisplay icon={goal.icon || defaultIconValue} className="h-8 w-8 object-contain" />
            </div>

            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-3">
                <h2 className="text-2xl font-bold tracking-tight text-slate-950">{goal.name}</h2>
                <span className="inline-flex items-center rounded-full bg-emerald-50 px-2 py-1 text-[10px] font-bold uppercase tracking-wide text-emerald-700">
                  {goal.status || "Progressing"}
                </span>
              </div>
              <p className="mt-2 text-sm text-slate-600">{goal.description || "Saving for my goal!"}</p>

              <div className="mt-4 flex flex-wrap items-center gap-5 text-[12px] text-slate-500">
                <span className="inline-flex items-center gap-2">
                  <svg viewBox="0 0 24 24" aria-hidden="true" className="h-3.5 w-3.5 fill-none stroke-current stroke-2"><path d="M7 2v3M17 2v3M4 9h16M5 5h14a1 1 0 0 1 1 1v13a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1Z" /></svg>
                  Target date {targetDate ? formatDate(targetDate) : "No target date"}
                </span>
                <span className="inline-flex items-center gap-2">
                  <svg viewBox="0 0 24 24" aria-hidden="true" className="h-3.5 w-3.5 fill-none stroke-current stroke-2"><path d="M12 6v6l4 2M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" /></svg>
                  Created {formatDate(createdDate)}
                </span>
              </div>
            </div>
          </div>

          <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
            <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">Total Target</p>
            <p className="mt-3 text-4xl font-bold tracking-tight text-slate-950">{formatCurrency(goal.amount, goal.currency)}</p>
            <div className="mt-4">
              <div className="flex items-center justify-between text-[11px] font-medium text-slate-600">
                <span>Progress</span>
                <span>{progress}%</span>
              </div>
              <div className="mt-2 h-2.5 w-full overflow-hidden rounded-full bg-slate-200">
                <div className="h-full rounded-full bg-emerald-500" style={{ width: `${progress}%` }} />
              </div>
            </div>
            <div className="mt-4 space-y-3 text-sm text-slate-700">
              <div className="flex items-center justify-between gap-3 border-t border-slate-200 pt-3">
                <span>Saved So Far</span>
                <span className="font-semibold text-slate-950">{formatCurrency(savedSoFar, goal.currency)}</span>
              </div>
              <div className="flex items-center justify-between gap-3 border-t border-slate-200 pt-3">
                <span>Remaining</span>
                <span className="font-semibold text-slate-950">{formatCurrency(remaining, goal.currency)}</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <MetricCard label="Saved So Far" value={formatCurrency(savedSoFar, goal.currency)} detail={`${formatCurrency(goal.amount, goal.currency)} target`} accent="emerald" />
        <MetricCard label="Total Added" value={formatCurrency(totalAdded, goal.currency)} detail={transactions.length > 0 ? `${transactions.filter((item) => item.amount > 0).length} contributions` : "No added funds yet"} accent="emerald" />
        <MetricCard label="Total Used" value={formatCurrency(-totalUsed, goal.currency)} detail={`${transactions.filter((item) => item.amount < 0).length} withdrawals`} accent="rose" />
        <MetricCard label="Target Date" value={targetDate ? formatDate(targetDate, { day: "2-digit", month: "short", year: "numeric" }) : "—"} detail={daysLeft !== null ? `${daysLeft} days left` : "No target set"} accent="slate" />
      </div>

      <section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 px-4 py-4">
          <h2 className="text-[15px] font-bold text-slate-950">Allocations</h2>
          <span className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-[10px] font-semibold uppercase tracking-wide text-slate-600">
            {transactions.length} {transactions.length === 1 ? "entry" : "entries"}
          </span>
        </div>

        <div className="overflow-x-auto">
          <div className="min-w-[700px]">
            <div className="grid grid-cols-[1.2fr_1.2fr_1.1fr_0.9fr_1.1fr] gap-3 border-b border-slate-100 bg-slate-50 px-4 py-3 text-[10px] font-semibold uppercase tracking-wide text-slate-500">
              <span>Date</span>
              <span>Account</span>
              <span>Type</span>
              <span>Amount</span>
              <span>Note</span>
            </div>

            {transactions.length === 0 ? (
              <div className="px-4 py-10 text-center text-sm text-slate-500">No allocations for this goal yet.</div>
            ) : (
              transactions.map((transaction) => {
                const delta = transaction.amount;
                const isAdded = delta >= 0;
                const sourceName = transaction.account?.name ?? "Account";

                return (
                  <div key={transaction.id} className="grid grid-cols-[1.2fr_1.2fr_1.1fr_0.9fr_1.1fr] items-center gap-3 border-b border-slate-100 px-4 py-3 text-xs text-slate-700 last:border-b-0">
                    <div>
                      <div className="font-medium text-slate-900">{formatDate(transaction.date)}</div>
                      <div className="mt-1 text-[10px] text-slate-500">{new Intl.DateTimeFormat("en-US", { hour: "numeric", minute: "2-digit" }).format(transaction.date)}</div>
                    </div>

                    <div className="min-w-0 text-slate-600">
                      <div className="truncate font-medium text-slate-900">{sourceName}</div>
                      <div className="mt-1 text-[10px] text-slate-500">Source account</div>
                    </div>

                    <div>
                      <span className={`inline-flex rounded-md px-2 py-1 text-[10px] font-semibold ${isAdded ? "bg-emerald-50 text-emerald-700" : "bg-rose-50 text-rose-700"}`}>
                        {isAdded ? "Allocated" : "Used"}
                      </span>
                    </div>

                    <div className={`font-semibold ${isAdded ? "text-emerald-700" : "text-rose-700"}`}>
                      {isAdded ? "+" : "-"}{formatCurrency(Math.abs(delta), goal.currency)}
                    </div>

                    <div className="truncate text-slate-500">{transaction.name || "—"}</div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </section>
    </div>
  );
}
