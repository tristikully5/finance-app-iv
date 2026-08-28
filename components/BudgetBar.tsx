"use client";

import React, { useRef, useState } from "react";

type Budget = { id: string; label: string; amount: number; color: string };

function formatCurrency(value: number, currency = "SGD") {
  return new Intl.NumberFormat("en-US", { style: "currency", currency, minimumFractionDigits: 2 }).format(value);
}

export default function BudgetBar({ total, currency, initialBudgets = [], onChange, goalId }: { total: number; currency?: string; initialBudgets?: Budget[]; onChange?: (budgets: Budget[]) => void; goalId?: number | string }) {
  const barRef = useRef<HTMLDivElement | null>(null);
  const [budgets, setBudgets] = useState<Budget[]>(() => {
    if (!initialBudgets || initialBudgets.length === 0) return [{ id: "unalloc", label: "Unallocated", amount: total, color: "bg-slate-300" }];
    const sum = initialBudgets.reduce((s, b) => s + b.amount, 0);
    const unalloc = Math.max(0, total - sum);
    return [...initialBudgets, { id: "unalloc", label: "Unallocated", amount: unalloc, color: "bg-slate-300" }];
  });

  // Load persisted budgets for this goal from localStorage on mount (if available)
  React.useEffect(() => {
    if (!goalId) return;
    try {
      const key = `budget_segments_goal_${goalId}`;
      const raw = localStorage.getItem(key);
      if (raw) {
        const parsed = JSON.parse(raw) as Budget[];
        // normalize loaded budgets to respect total and rounding
        const normalized = normalizeBudgets(parsed.map((b) => ({ ...b })));
        setBudgets(normalized);
      }
    } catch (e) {
      // ignore parse errors
    }

    // Listen for updates dispatched by other components in the same window
    function onBudgetUpdate(e: any) {
      try {
        const detail = e?.detail;
        if (!detail) return;
        if (String(detail.goalId) !== String(goalId)) return;
        const parsed = detail.budgets || [];
        const normalized = normalizeBudgets((parsed as Budget[]).map((b) => ({ ...b })));
        setBudgets(normalized);
        onChange?.(normalized);
      } catch (err) {
        // ignore
      }
    }

    // Listen for storage events from other tabs/windows
    function onStorage(e: StorageEvent) {
      try {
        if (!e.key) return;
        const expectedKey = `budget_segments_goal_${goalId}`;
        if (e.key !== expectedKey) return;
        const raw = e.newValue;
        if (!raw) return;
        const parsed = JSON.parse(raw) as Budget[];
        const normalized = normalizeBudgets(parsed.map((b) => ({ ...b })));
        setBudgets(normalized);
        onChange?.(normalized);
      } catch (err) {
        // ignore
      }
    }

    window.addEventListener("budget_segments_updated", onBudgetUpdate as EventListener);
    window.addEventListener("storage", onStorage as EventListener);
    return () => {
      window.removeEventListener("budget_segments_updated", onBudgetUpdate as EventListener);
      window.removeEventListener("storage", onStorage as EventListener);
    };
  }, [goalId]);

  const [label, setLabel] = useState("");
  const [amount, setAmount] = useState(0);

  const colorCycle = ["bg-emerald-400", "bg-violet-400", "bg-rose-400", "bg-amber-400", "bg-sky-400"];

  // Ensure budgets are valid: non-negative, rounded to whole numbers, non-unalloc sum <= total.
  function normalizeBudgets(input: Budget[]): Budget[] {
    const copy = input.map((b) => ({ ...b }));
    // clamp negatives to 0
    copy.forEach((b) => { if (!Number.isFinite(b.amount) || b.amount < 0) b.amount = 0; b.amount = Math.round(b.amount); });

    const unallocIdx = copy.findIndex((b) => b.id === "unalloc");
    const nonUnalloc = copy.filter((b) => b.id !== "unalloc");
    const nonSum = nonUnalloc.reduce((s, b) => s + b.amount, 0);

    if (nonSum <= total) {
      // set unalloc to remainder (ensure exists)
      const remainder = Math.max(0, total - nonSum);
      if (unallocIdx === -1) copy.push({ id: "unalloc", label: "Unallocated", amount: remainder, color: "bg-slate-300" });
      else copy[unallocIdx].amount = remainder;
      return copy;
    }

    // nonSum > total -> scale down non-unalloc proportionally to fit total
    const scale = total / nonSum;
    let scaled = nonUnalloc.map((b) => ({ ...b, amount: Math.max(0, Math.round(b.amount * scale)) }));
    // due to rounding, adjust to match total exactly by distributing remainder
    let scaledSum = scaled.reduce((s, b) => s + b.amount, 0);
    // if scaledSum > total, reduce largest elements
    if (scaledSum > total) {
      let over = scaledSum - total;
      // sort indices by amount desc
      const idxs = scaled.map((b, i) => i).sort((a, b) => scaled[b].amount - scaled[a].amount);
      for (const i of idxs) {
        if (over <= 0) break;
        const take = Math.min(over, scaled[i].amount);
        scaled[i].amount -= take;
        over -= take;
      }
      scaledSum = scaled.reduce((s, b) => s + b.amount, 0);
    }
    // if scaledSum < total, put remainder into unallocated
    const remainder = Math.max(0, total - scaledSum);

    const result: Budget[] = [];
    // reinsert scaled in original order
    for (const b of copy) {
      if (b.id === "unalloc") continue;
      const s = scaled.find((x) => x.id === b.id) || { ...b, amount: 0 };
      result.push({ ...b, amount: s.amount });
    }
    result.push({ id: "unalloc", label: "Unallocated", amount: remainder, color: "bg-slate-300" });
    return result;
  }

  function persistAndNotify(goalIdLocal: any, normalized: Budget[]) {
    if (!goalIdLocal) return;
    try {
      const key = `budget_segments_goal_${goalIdLocal}`;
      localStorage.setItem(key, JSON.stringify(normalized));
      try { window.dispatchEvent(new CustomEvent("budget_segments_updated", { detail: { goalId: goalIdLocal, budgets: normalized } })); } catch (e) {}
    } catch (e) {}
  }

  function addBudget() {
    const amt = Number(amount) || 0;
    if (!label || amt <= 0) return;
    const unallocIdx = budgets.findIndex((b) => b.id === "unalloc");
    if (unallocIdx === -1) return;
    if (amt > budgets[unallocIdx].amount) return; // don't allow over-alloc

    const newBudget: Budget = { id: String(Date.now()), label, amount: amt, color: colorCycle[(budgets.length - 1) % colorCycle.length] };
    const newUnalloc = { ...budgets[unallocIdx], amount: budgets[unallocIdx].amount - amt };
    const next = [...budgets.slice(0, unallocIdx), newBudget, newUnalloc, ...budgets.slice(unallocIdx + 1)];
    const normalized = normalizeBudgets(next);
    setBudgets(normalized);
    onChange?.(normalized);
    persistAndNotify(goalId, normalized);
    setLabel("");
    setAmount(0);
  }

  function removeBudget(id: string) {
    const idx = budgets.findIndex((b) => b.id === id);
    if (idx === -1) return;
    // add amount back into unallocated
    const unallocIdx = budgets.findIndex((b) => b.id === "unalloc");
    const updated = budgets.filter((b) => b.id !== id);
    if (unallocIdx === -1) {
      const next = updated.concat([{ id: "unalloc", label: "Unallocated", amount: budgets[idx].amount, color: "bg-slate-300" }]);
      const normalized = normalizeBudgets(next);
      setBudgets(normalized);
      onChange?.(normalized);
    persistAndNotify(goalId, normalized);
    } else {
      const newUnallocAmount = budgets[unallocIdx].amount + budgets[idx].amount;
      const next = updated.map((b) => (b.id === "unalloc" ? { ...b, amount: newUnallocAmount } : b));
      const normalized = normalizeBudgets(next);
      setBudgets(normalized);
      onChange?.(normalized);
    persistAndNotify(goalId, normalized);
    }
  }

  // dragging
  function onPointerDownHandle(e: React.PointerEvent, leftIdx: number) {
    const left = leftIdx;
    const right = leftIdx + 1;
    const startX = e.clientX;
    const bar = barRef.current;
    if (!bar) return;
    const rect = bar.getBoundingClientRect();
    const totalPx = rect.width;

    const leftStart = budgets[left].amount;
    const rightStart = budgets[right].amount;

    function onMove(ev: PointerEvent) {
      const deltaPx = ev.clientX - startX;
      const deltaAmount = (deltaPx / totalPx) * total;
      const newLeft = Math.max(0, Math.min(total, leftStart + deltaAmount));
      const newRight = Math.max(0, Math.min(total, rightStart - deltaAmount));
      // enforce non-negative and not exceeding total
      const updated = budgets.map((b) => ({ ...b }));
      // Round to whole numbers when dragging (store as whole number, formatCurrency will show two decimals)
      const combined = leftStart + rightStart;
      const leftRounded = Math.max(0, Math.round(newLeft));
      const rightRounded = Math.max(0, Math.round(combined - leftRounded));
      updated[left].amount = leftRounded;
      updated[right].amount = rightRounded;
      const normalized = normalizeBudgets(updated);
      setBudgets(normalized);
      onChange?.(normalized);
      // persist per-goal in localStorage
      if (goalId) {
        try {
          const key = `budget_segments_goal_${goalId}`;
          localStorage.setItem(key, JSON.stringify(normalized));
          // notify other listeners in this window (storage event doesn't fire in same window)
          try { window.dispatchEvent(new CustomEvent("budget_segments_updated", { detail: { goalId, budgets: normalized } })); } catch (e) {}
        } catch (e) {
          // ignore storage errors
        }
      }
    }

    function onUp() {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
    }

    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
    (e.target as Element).setPointerCapture(e.pointerId);
  }

  const sum = budgets.reduce((s, b) => s + b.amount, 0);

  // notify parent on initial mount and when budgets change
  React.useEffect(() => {
    const normalized = normalizeBudgets(budgets);
    if (JSON.stringify(normalized) !== JSON.stringify(budgets)) {
      setBudgets(normalized);
      if (goalId) { try { localStorage.setItem(`budget_segments_goal_${goalId}`, JSON.stringify(normalized)); } catch (e) {} }
      onChange?.(normalized);
    } else {
      onChange?.(budgets);
    }
  }, [budgets]);

  return (
    <div className="p-4">
      <div className="mb-3 flex items-center justify-between">
        <div>
          <div className="text-xs font-semibold text-slate-500">Budget Allocation</div>
          <div className="text-sm text-slate-700">Total {formatCurrency(total, currency)}</div>
        </div>
        <div className="flex items-center gap-2">
          <input value={label} onChange={(e) => setLabel(e.target.value)} placeholder="Label" className="rounded border border-slate-200 px-2 py-1 text-sm" />
          <input value={amount} onChange={(e) => setAmount(Number(e.target.value))} type="number" min={0} step="0.01" placeholder="Amount" className="w-24 rounded border border-slate-200 px-2 py-1 text-sm" />
          <button type="button" onClick={addBudget} className="rounded bg-emerald-600 px-3 py-1 text-sm font-semibold text-white">Add</button>
        </div>
      </div>

      <div className="rounded border border-slate-200 bg-slate-50 p-3">
        <div ref={barRef} className="relative flex h-10 w-full overflow-hidden rounded bg-white">
          {budgets.map((b, i) => {
            const rawWidth = total > 0 ? (b.amount / total) * 100 : 0;
            const width = Math.max(0, Math.min(rawWidth, 100));
            const showHandle = i < budgets.length - 1;
            return (
              <div key={b.id} style={{ width: `${width}%` }} className={`relative flex items-center justify-center text-xs text-white ${b.color}`}>
                <div className="px-2 py-1 text-[12px] font-semibold text-slate-900" style={{ color: "#042" }}>
                    {b.label} ({formatCurrency(Math.max(0, Math.min(b.amount, total)), currency)})
                </div>
                {showHandle && (
                  <div
                    onPointerDown={(e) => onPointerDownHandle(e, i)}
                    className="absolute right-0 top-0 h-full w-2 cursor-col-resize bg-white opacity-0 hover:opacity-100"
                    aria-hidden
                  />
                )}
              </div>
            );
          })}
        </div>

        <div className="mt-3 flex flex-wrap items-center gap-3 text-sm text-slate-600">
          <div>Allocated {formatCurrency(sum, currency)}</div>
          <div>Unallocated {formatCurrency(Math.max(0, total - sum), currency)}</div>
        </div>

        <div className="mt-3 flex flex-wrap gap-2">
          {budgets.filter((b) => b.id !== "unalloc").map((b) => (
            <div key={b.id} className="inline-flex items-center gap-2 rounded bg-slate-50 px-2 py-1 text-sm text-slate-700">
              <span className="font-medium">{b.label}</span>
              <span className="text-slate-500">{formatCurrency(b.amount, currency)}</span>
              <button onClick={() => removeBudget(b.id)} className="rounded bg-rose-50 px-2 py-0.5 text-xs text-rose-700">Remove</button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
