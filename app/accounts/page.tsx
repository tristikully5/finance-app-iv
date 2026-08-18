import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";
import QuickAddShell from "@/app/components/QuickAddShell";
import EditableCard from "@/components/EditableCard";
import { AccountEditForm } from "@/components/AccountEditDialog";
import IconDisplay from "@/components/IconDisplay";
import PageHeader from "@/components/PageHeader";
import { defaultIconValue } from "@/lib/icon-options";

export const dynamic = "force-dynamic";

type BalanceRow = {
  date: Date;
  amount: number;
  type: "Income" | "Expense" | "Transfer";
  accountId: number;
  toAccountId: number | null;
  goalId: number | null;
};

function isUnknownToAccountIdSelectionError(error: unknown) {
  if (!(error instanceof Error)) {
    return false;
  }

  return error.message.includes("Unknown field `toAccountId`") || error.message.includes("Unknown field `goalId`");
}

export default async function AccountsPage() {
  try {
    const accountsPromise = prisma.account.findMany({
      where: { archived: false },
      orderBy: { createdAt: "desc" },
    });

    const transactionsPromise = prisma.transaction
      .findMany({
        select: { date: true, amount: true, type: true, accountId: true, toAccountId: true, goalId: true },
      })
      .catch(async (error) => {
        if (!isUnknownToAccountIdSelectionError(error)) {
          throw error;
        }

        // Fallback for stale Prisma runtime clients while schema includes toAccountId.
        return prisma.$queryRaw<BalanceRow[]>(
          Prisma.sql`SELECT "date", "amount", "type", "accountId", "toAccountId", "goalId" FROM "Transaction"`
        );
      });

    const [accounts, transactions] = await Promise.all([
      accountsPromise,
      transactionsPromise,
    ]);

    const balances = transactions.reduce<Record<number, { actual: number; reserved: number }>>((acc, transaction) => {
      const current = acc[transaction.accountId] ?? { actual: 0, reserved: 0 };

      if (transaction.type === "Income") {
        current.actual += transaction.amount;
        acc[transaction.accountId] = current;
        return acc;
      }

      if (transaction.type === "Expense") {
        current.actual -= transaction.amount;
        acc[transaction.accountId] = current;
        return acc;
      }

      if (transaction.type === "Transfer") {
        if (transaction.goalId) {
          current.reserved += transaction.amount;
          acc[transaction.accountId] = current;
          return acc;
        }

        current.actual -= transaction.amount;
        acc[transaction.accountId] = current;

        if (transaction.toAccountId) {
          const destination = acc[transaction.toAccountId] ?? { actual: 0, reserved: 0 };
          destination.actual += transaction.amount;
          acc[transaction.toAccountId] = destination;
        }
      }

      return acc;
    }, {});

    const formatSummaryCurrency = (value: number) =>
      new Intl.NumberFormat("en-US", {
        style: "currency",
        currency: accounts[0]?.currency || "SGD",
      }).format(value);
    const accountSummaries = accounts.map((account) => {
      const breakdown = balances[account.id] ?? { actual: 0, reserved: 0 };
      return { account, available: breakdown.actual - breakdown.reserved };
    });
    const totalBalance = accountSummaries.reduce((sum, item) => sum + item.available, 0);
    const now = new Date();
    const currentMonthKey = now.toISOString().slice(0, 7);
    const previousMonthDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const previousMonthKey = previousMonthDate.toISOString().slice(0, 7);
    const getMonthTotal = (type: "Income" | "Expense", monthKey: string) =>
      transactions
        .filter((transaction) => transaction.type === type && transaction.date.toISOString().slice(0, 7) === monthKey)
        .reduce((sum, transaction) => sum + transaction.amount, 0);
    const income = getMonthTotal("Income", currentMonthKey);
    const previousIncome = getMonthTotal("Income", previousMonthKey);
    const expense = getMonthTotal("Expense", currentMonthKey);
    const previousExpense = getMonthTotal("Expense", previousMonthKey);
    const getComparison = (current: number, previous: number) => {
      if (previous === 0) {
        return { text: current === 0 ? "No change vs last month" : "New this month", className: "text-slate-500" };
      }

      const change = ((current - previous) / previous) * 100;
      return {
        text: `${change >= 0 ? "↑" : "↓"} ${Math.abs(change).toFixed(1)}% vs last month`,
        className: change >= 0 ? "text-emerald-600" : "text-rose-600",
      };
    };
    const incomeComparison = getComparison(income, previousIncome);
    const expenseComparison = getComparison(expense, previousExpense);

    return (
      <div className="space-y-7">
        <PageHeader breadcrumbs={[{ label: "Overview", href: "/" }, { label: "Accounts" }]} title="Accounts" description="Manage your accounts and balances." />

        <section className="grid overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm sm:grid-cols-2 xl:grid-cols-4" aria-label="Accounts summary">
          <div className="flex items-center gap-3 border-b border-slate-100 px-5 py-4 sm:border-r xl:border-b-0">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-slate-100 text-slate-700">
              <svg viewBox="0 0 24 24" className="h-5 w-5 fill-none stroke-current" strokeWidth="1.6" aria-hidden="true"><rect x="4" y="5" width="16" height="14" rx="2" /><path d="M4 9h16M8 14h3" /></svg>
            </span>
            <div className="min-w-0">
              <p className="text-[10px] text-slate-500">Total balance</p>
              <p className="mt-1 truncate text-sm font-bold text-slate-900">{formatSummaryCurrency(totalBalance)}</p>
            </div>
          </div>
          <div className="flex items-center gap-3 border-b border-slate-100 px-5 py-4 xl:border-r xl:border-b-0">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-emerald-50 text-emerald-600">
              <svg viewBox="0 0 24 24" className="h-5 w-5 fill-none stroke-current" strokeWidth="1.7" aria-hidden="true"><path d="M12 18V6M7.5 10 12 5.5l4.5 4.5" strokeLinecap="round" strokeLinejoin="round" /></svg>
            </span>
            <div className="min-w-0">
              <p className="text-[10px] text-slate-500">Income</p>
              <p className="mt-1 truncate text-sm font-bold text-slate-900">{formatSummaryCurrency(income)}</p>
              <p className={`mt-1 text-[10px] ${incomeComparison.className}`}>{incomeComparison.text}</p>
            </div>
          </div>
          <div className="flex items-center gap-3 border-b border-slate-100 px-5 py-4 sm:border-b-0 xl:border-r">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-rose-50 text-rose-600">
              <svg viewBox="0 0 24 24" className="h-5 w-5 fill-none stroke-current" strokeWidth="1.7" aria-hidden="true"><path d="M12 6v12M7.5 14 12 18.5l4.5-4.5" strokeLinecap="round" strokeLinejoin="round" /></svg>
            </span>
            <div className="min-w-0">
              <p className="text-[10px] text-slate-500">Expense</p>
              <p className="mt-1 truncate text-sm font-bold text-slate-900">{formatSummaryCurrency(expense)}</p>
              <p className={`mt-1 text-[10px] ${expenseComparison.className}`}>{expenseComparison.text}</p>
            </div>
          </div>
          <div className="flex items-center gap-3 px-5 py-4">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-slate-100 text-slate-700">
              <svg viewBox="0 0 24 24" className="h-5 w-5 fill-none stroke-current" strokeWidth="1.5" aria-hidden="true"><path d="M4 19h16M6 19v-7h12v7M4 12l8-6 8 6M9 12v-3h6v3" strokeLinecap="round" strokeLinejoin="round" /></svg>
            </span>
            <div>
              <p className="text-[10px] text-slate-500">Accounts</p>
              <p className="mt-1 text-sm font-bold text-slate-900">{accounts.length}</p>
              <p className="mt-1 text-[10px] text-slate-500">{accounts.length} active</p>
            </div>
          </div>
        </section>

        <div className="space-y-3">
          {accounts.map((account) => {
            const breakdown = balances[account.id] ?? { actual: 0, reserved: 0 };
            const available = breakdown.actual - breakdown.reserved;
            const formatCurrency = (value: number) =>
              new Intl.NumberFormat("en-US", {
                style: "currency",
                currency: account.currency || "USD",
              }).format(value);

            const maxMagnitude = Math.max(Math.abs(available), Math.abs(breakdown.actual), 1);
            return (
              <EditableCard
                key={account.id}
                title={account.name}
                subtitle={`${account.type} • ${account.currency}`}
                headerContent={
                  <span className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-slate-100">
                    <IconDisplay icon={account.icon || defaultIconValue} alt="Account icon" className="h-5 w-5 object-contain" />
                  </span>
                }
                layout="row"
                className="sm:py-5"
                cardHref={`/accounts/${account.id}`}
                modalTitle="Edit account"
                modalDescription="Update this account for your finances."
                editContent={<AccountEditForm account={{ id: account.id, name: account.name, type: account.type, currency: account.currency, icon: account.icon || defaultIconValue }} />}
              >
                <div className="space-y-3">
                  <div className="grid grid-cols-2 gap-5 py-1 sm:gap-8">
                    <div className="min-w-0">
                      <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">Available</p>
                      <p className="mt-2 whitespace-nowrap text-base font-semibold leading-none tracking-tight text-slate-900">{formatCurrency(available)}</p>
                      <progress className="account-progress account-progress-available mt-4" value={Math.abs(available)} max={maxMagnitude} aria-label={`Available balance ${formatCurrency(available)}`} />
                    </div>

                    <div className="min-w-0">
                      <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">Actual</p>
                      <p className="mt-2 whitespace-nowrap text-base font-medium leading-none text-slate-900">{formatCurrency(breakdown.actual)}</p>
                      <progress className="account-progress account-progress-actual mt-4" value={Math.abs(breakdown.actual)} max={maxMagnitude} aria-label={`Actual balance ${formatCurrency(breakdown.actual)}`} />
                    </div>
                  </div>

                  {breakdown.reserved > 0 ? (
                    <div className="flex items-center justify-between rounded-xl bg-emerald-50 px-3 py-2.5 text-emerald-700">
                      <span className="flex items-center gap-2 text-xs font-semibold"><IconDisplay icon={account.icon || defaultIconValue} className="h-4 w-4 object-contain" />{formatCurrency(breakdown.reserved)} saved</span>
                      <span className="text-lg leading-none">›</span>
                    </div>
                  ) : null}
                </div>
              </EditableCard>
            );
          })}

          <div>
            <QuickAddShell
              kind="account"
              wrapperClassName="relative"
              buttonClassName="group flex min-h-24 w-full items-center justify-center gap-3 rounded-xl border border-dashed border-slate-300 bg-white text-slate-500 transition hover:border-slate-400 hover:bg-slate-50"
              buttonContent={<><span className="flex h-10 w-10 items-center justify-center rounded-full bg-slate-100 text-3xl font-light leading-none text-slate-500 transition group-hover:bg-slate-200">+</span><span className="text-sm font-semibold">Add account</span></>}
            />
          </div>
        </div>
      </div>
    );
  } catch (error) {
    console.error("Failed to load accounts:", error);
    return (
      <div className="space-y-5">
        <PageHeader breadcrumbs={[{ label: "Overview", href: "/" }, { label: "Accounts" }]} title="Accounts" description="Manage your accounts and balances." />
        <div className="rounded-lg border border-amber-300 bg-amber-50 p-4 text-sm text-amber-800">Unable to load accounts right now. Please make sure the Vercel environment variable DATABASE_URL points to a reachable PostgreSQL database.</div>
      </div>
    );
  }
}
