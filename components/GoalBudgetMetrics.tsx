"use client";

import React, { useState } from "react";
import BudgetBar from "@/components/BudgetBar";

function formatCurrency(value: number, currency = "SGD") {
  return new Intl.NumberFormat("en-US", { style: "currency", currency, minimumFractionDigits: 2 }).format(value);
}

export default function GoalBudgetMetrics({ total, currency, allocated, spent, goalId }: { total: number; currency?: string; allocated: number; spent: number; goalId?: number }) {
  const [budgeted, setBudgeted] = useState<number>(0);

  React.useEffect(() => {
    if (!goalId) return;
    try {
      const raw = localStorage.getItem(`budget_segments_goal_${goalId}`);
      if (raw) {
        const parsed = JSON.parse(raw) as { id: string; label: string; amount: number; color: string }[];
        const sum = parsed.filter((b) => b.id !== "unalloc").reduce((s, b) => s + b.amount, 0);
        setBudgeted(Math.round(sum));
      }
    } catch (e) {
      // ignore
    }
  }, [goalId]);

  function handleBudgetsChange(budgets: { id: string; label: string; amount: number; color: string }[]) {
    const sum = budgets.filter((b) => b.id !== "unalloc").reduce((s, b) => s + b.amount, 0);
    setBudgeted(Math.round(sum));
  }

  return (
    <div className="space-y-4">
      <div>
        <BudgetBar total={total} currency={currency} initialBudgets={[]} onChange={handleBudgetsChange} goalId={goalId} />
      </div>
    </div>
  );
}
