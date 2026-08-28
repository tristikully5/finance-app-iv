"use client";

import React from "react";

function formatCurrency(value: number, currency = "SGD") {
  return new Intl.NumberFormat("en-US", { style: "currency", currency, minimumFractionDigits: 2 }).format(value);
}

export default function GoalBudgetSummary({ total, currency, allocated, spent, goalId, isConcluded = false }: { total: number; currency?: string; allocated: number; spent: number; goalId?: number; isConcluded?: boolean }) {
  const [budgeted, setBudgeted] = React.useState<number>(0);
  const [actualsSum, setActualsSum] = React.useState<number>(0);

  React.useEffect(() => {
    function updateFromStorage(parsedRaw?: any[]) {
      try {
        const parsed = parsedRaw ?? JSON.parse(localStorage.getItem(`budget_segments_goal_${goalId}`) ?? "[]");
        const sum = (parsed ?? []).filter((b: any) => b && b.id !== "unalloc").reduce((s: number, b: any) => s + (Number(b.amount) || 0), 0);
        setBudgeted(Math.min(Math.round(sum), Math.round(total || 0)));
      } catch (e) {
        setBudgeted(0);
      }
    }

    function updateActualsFromStorage(parsedActuals?: Record<string, number>) {
      try {
        const raw = parsedActuals ?? JSON.parse(localStorage.getItem(`budget_actuals_goal_${goalId}`) ?? "{}");
        const values = Object.values(raw || {}).map((v) => Number(v) || 0);
        const s = values.reduce((a, b) => a + b, 0);
        setActualsSum(Math.max(0, Math.round(s)));
      } catch (e) {
        setActualsSum(0);
      }
    }

    if (!goalId) {
      setBudgeted(0);
      setActualsSum(0);
      return;
    }

    updateFromStorage();
    updateActualsFromStorage();

    function onBudgetUpdate(e: any) {
      try {
        const detail = e?.detail;
        if (!detail) return;
        if (String(detail.goalId) !== String(goalId)) return;
        updateFromStorage(detail.budgets || []);
      } catch (err) {
        // ignore
      }
    }

    function onActualsUpdate(e: any) {
      try {
        const detail = e?.detail;
        if (!detail) return;
        if (String(detail.goalId) !== String(goalId)) return;
        updateActualsFromStorage(detail.actuals || {});
      } catch (err) {
        // ignore
      }
    }

    function onStorage(e: StorageEvent) {
      try {
        if (!e.key) return;
        if (e.key === `budget_segments_goal_${goalId}`) {
          updateFromStorage();
        }
        if (e.key === `budget_actuals_goal_${goalId}`) {
          updateActualsFromStorage();
        }
      } catch (err) {}
    }

    window.addEventListener("budget_segments_updated", onBudgetUpdate as EventListener);
    window.addEventListener("budget_actuals_updated", onActualsUpdate as EventListener);
    window.addEventListener("storage", onStorage as EventListener);
    return () => {
      window.removeEventListener("budget_segments_updated", onBudgetUpdate as EventListener);
      window.removeEventListener("budget_actuals_updated", onActualsUpdate as EventListener);
      window.removeEventListener("storage", onStorage as EventListener);
    };
  }, [goalId, total]);

  // displayed spent: include actuals from budget segments if they exceed transaction-derived spent
  const displayedSpent = isConcluded ? spent : Math.max(spent || 0, actualsSum || 0);

  return (
    <div className="space-y-4 mb-4">
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="inline-flex rounded-full px-2 py-1 text-[10px] font-semibold bg-slate-100 text-slate-700">Target amount</div>
          <p className="mt-3 text-2xl font-bold tracking-tight text-slate-950">{formatCurrency(total, currency)}</p>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="inline-flex rounded-full px-2 py-1 text-[10px] font-semibold bg-emerald-50 text-emerald-700">Allocated amount</div>
          <p className="mt-3 text-2xl font-bold tracking-tight text-emerald-700">{formatCurrency(allocated, currency)}</p>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="inline-flex rounded-full px-2 py-1 text-[10px] font-semibold bg-rose-50 text-rose-700">Spent amount</div>
          <p className="mt-3 text-2xl font-bold tracking-tight text-rose-700">{formatCurrency(displayedSpent, currency)}</p>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="inline-flex rounded-full px-2 py-1 text-[10px] font-semibold bg-violet-50 text-violet-700">Budgeted</div>
          <p className="mt-3 text-2xl font-bold tracking-tight text-slate-950">{formatCurrency(budgeted, currency)}</p>
        </div>
      </div>
    </div>
  );
}
