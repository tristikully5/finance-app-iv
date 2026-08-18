import Link from "next/link";
import BudgetCategoryRows from "@/components/BudgetCategoryRows";

export type BudgetOverviewCategory = {
  id: number;
  name: string;
  type: string;
  icon: string | null;
  monthlyTotal: number;
  monthlyCurrency: string;
  monthlyBudget: number;
  monthlyBudgetCurrency: string;
  isActive: boolean;
};

type BudgetOverviewProps = {
  expenses: BudgetOverviewCategory[];
  incomes: BudgetOverviewCategory[];
  monthKey: string;
  currency: string;
};

function formatCurrency(value: number, currency: string) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: currency || "SGD" }).format(value);
}

export default function BudgetOverview({ expenses, incomes, monthKey, currency }: BudgetOverviewProps) {
  const totalBudget = expenses.reduce((sum, category) => sum + Math.max(0, category.monthlyBudget), 0);
  const totalSpent = expenses.reduce((sum, category) => sum + Math.abs(category.monthlyTotal), 0);
  const incomeReceived = incomes.reduce((sum, category) => sum + Math.abs(category.monthlyTotal), 0);
  const remaining = incomeReceived - totalSpent;
  const remainingAmount = Math.max(totalBudget - totalSpent, 0);
  const remainingPercent = totalBudget > 0 ? Math.max(100 - Math.round((totalSpent / totalBudget) * 100), 0) : 0;

  return (
    <div className="grid gap-5 lg:grid-cols-[1.15fr_0.85fr]">
      <div className="space-y-5">
        <section>
          <div className="mb-2 flex items-center justify-between"><h2 className="text-sm font-bold text-slate-950">Overview</h2><Link href="/categories" className="inline-flex h-7 items-center gap-1.5 rounded-md border border-slate-200 bg-white px-2.5 text-[10px] font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50">✎ Edit budget</Link></div>
          <div className="rounded-lg border border-slate-200 bg-white p-3.5 shadow-sm"><div className="grid grid-cols-2 gap-4"><div><p className="text-[10px] font-medium text-slate-500">Total spent</p><p className="mt-1 text-sm font-bold text-slate-950">{formatCurrency(totalSpent, currency)}</p></div><div><p className="text-[10px] font-medium text-slate-500">Total budget</p><p className="mt-1 text-sm font-bold text-slate-950">{formatCurrency(totalBudget, currency)}</p></div></div><div className="mt-3 flex items-center gap-2"><div className="h-1.5 flex-1 overflow-hidden rounded-full bg-slate-100"><div className="h-full rounded-full bg-blue-500" style={{ width: `${Math.min(Math.max(remainingPercent, 0), 100)}%` }} /></div><span className="w-7 text-right text-[10px] font-semibold text-slate-700">{remainingPercent}%</span></div><p className="mt-2 text-[10px] text-slate-500">{formatCurrency(remainingAmount, currency)} of {formatCurrency(totalBudget, currency)} remaining</p></div>
        </section>

        <section><h2 className="mb-2 text-sm font-bold text-slate-950">Expenses</h2><BudgetCategoryRows categories={expenses} monthKey={monthKey} variant="expense" /></section>
      </div>

      <div className="space-y-5">
        <section><div className="mb-2 flex items-center justify-between"><h2 className="text-sm font-bold text-slate-950">Income</h2><span className="text-[10px] text-slate-400">{monthKey}</span></div><BudgetCategoryRows categories={incomes} monthKey={monthKey} variant="income" /></section>
        <section><h2 className="mb-2 text-sm font-bold text-slate-950">Summary</h2><div className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm"><div className="space-y-3 px-3 py-3.5 text-[11px]"><div className="flex items-center justify-between"><span className="text-slate-600">Total budget</span><strong className="text-slate-800">{formatCurrency(totalBudget, currency)}</strong></div><div className="flex items-center justify-between"><span className="text-slate-600">Total spent</span><strong className="text-slate-800">{formatCurrency(totalSpent, currency)}</strong></div><div className="flex items-center justify-between"><span className="text-slate-600">Income received</span><strong className="text-emerald-600">{formatCurrency(incomeReceived, currency)}</strong></div></div><div className="flex items-center justify-between bg-emerald-50 px-3 py-2.5 text-[11px]"><span className="font-semibold text-emerald-700">Remaining</span><strong className="text-emerald-700">{formatCurrency(remaining, currency)}</strong></div></div></section>
      </div>
    </div>
  );
}
