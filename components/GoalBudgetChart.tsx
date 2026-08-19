"use client";

import React, { useEffect, useState } from "react";

function formatCurrency(value: number, currency = "SGD") {
  return new Intl.NumberFormat("en-US", { style: "currency", currency, minimumFractionDigits: 2 }).format(value);
}

export default function GoalBudgetChart({ goalId, total, currency }: { goalId?: number; total: number; currency?: string }) {
  const [items, setItems] = useState<{ id: string; label: string; amount: number; color: string }[]>([]);

  useEffect(() => {
    function processRaw(parsedRaw: any[]) {
      const parsed = (parsedRaw || []).map((b) => ({ id: String(b.id), label: b.label ?? "", amount: Math.max(0, Math.round(Number(b.amount) || 0)), color: b.color ?? "bg-slate-300" }));
      const sum = parsed.reduce((s, b) => s + b.amount, 0);
      const hasUnalloc = parsed.some((b) => b.id === "unalloc");
      const next = parsed.slice();
      if (!hasUnalloc) next.push({ id: "unalloc", label: "Unallocated", amount: Math.max(0, total - sum), color: "bg-slate-300" });
      const nonUnalloc = next.filter((b) => b.id !== "unalloc");
      const nonSum = nonUnalloc.reduce((s, b) => s + b.amount, 0);
      if (nonSum > total) {
        const scale = total / nonSum;
        let scaled = nonUnalloc.map((b) => ({ ...b, amount: Math.max(0, Math.round(b.amount * scale)) }));
        let scaledSum = scaled.reduce((s, b) => s + b.amount, 0);
        const remainder = Math.max(0, total - scaledSum);
        const final = scaled.concat([{ id: "unalloc", label: "Unallocated", amount: remainder, color: "bg-slate-300" }]);
        setItems(final);
      } else {
        const remainder = Math.max(0, total - nonSum);
        const filtered = next.filter((b) => b.id !== "unalloc");
        setItems(filtered.concat([{ id: "unalloc", label: "Unallocated", amount: remainder, color: "bg-slate-300" }]));
      }
    }

    if (!goalId) {
      setItems([{ id: "unalloc", label: "Unallocated", amount: total, color: "bg-slate-300" }]);
      return;
    }

    try {
      const raw = localStorage.getItem(`budget_segments_goal_${goalId}`);
      if (raw) {
        const parsedRaw = JSON.parse(raw);
        processRaw(parsedRaw);
      } else {
        setItems([{ id: "unalloc", label: "Unallocated", amount: total, color: "bg-slate-300" }]);
      }
    } catch (e) {
      setItems([{ id: "unalloc", label: "Unallocated", amount: total, color: "bg-slate-300" }]);
    }

    function onBudgetUpdate(e: any) {
      try {
        const detail = e?.detail;
        if (!detail) return;
        if (String(detail.goalId) !== String(goalId)) return;
        processRaw(detail.budgets || []);
      } catch (err) {
        // ignore
      }
    }

    window.addEventListener("budget_segments_updated", onBudgetUpdate as EventListener);
    return () => window.removeEventListener("budget_segments_updated", onBudgetUpdate as EventListener);
  }, [goalId, total]);

  const maxBlocks = 20;

  return (
    <section className="mt-4 rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-bold text-slate-900">Budget breakdown</h3>
        <span className="text-xs text-slate-500">Total {formatCurrency(total, currency)}</span>
      </div>

      <div className="mt-4 grid gap-3">
        {items.slice().filter(Boolean).map((it) => {
          const clampedAmount = Math.max(0, Math.min(it.amount, total));
          const count = total > 0 ? Math.round((clampedAmount / total) * maxBlocks) : 0;
          const blocks = Array.from({ length: Math.max(0, count) });
          return (
            <div key={it.id} className="flex items-center gap-3">
              <div className="w-28 text-sm text-slate-700">{it.label}</div>
              <div className="w-16 text-sm font-semibold text-slate-900">{formatCurrency(clampedAmount, currency)}</div>
              <div className="flex items-center gap-0">
                {blocks.length === 0 ? (
                  <div className="h-4 w-8 rounded bg-slate-100" />
                ) : (
                  blocks.map((_, idx) => (
                    <div key={idx} className={`mr-1 h-4 w-3 rounded ${it.color}`} />
                  ))
                )}
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
