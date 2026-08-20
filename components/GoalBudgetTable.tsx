"use client";

import React, { useEffect, useState } from "react";
import Modal from "./Modal";

type Tx = { id: number; name: string; amount: number; date?: string };

function formatCurrency(value: number, currency = "SGD") {
  return new Intl.NumberFormat("en-US", { style: "currency", currency, minimumFractionDigits: 2 }).format(value);
}

export default function GoalBudgetTable({ goalId, total, currency, transactions }: { goalId?: number; total: number; currency?: string; transactions?: Tx[] }) {
  const [budgets, setBudgets] = useState<{ id: string; label: string; amount: number; color: string }[]>([]);
  const [selected, setSelected] = useState<Record<string, boolean>>({});
  const [overrides, setOverrides] = useState<Record<string, number>>({});

  useEffect(() => {
    function load() {
      if (!goalId) { setBudgets([{ id: "unalloc", label: "Unallocated", amount: total, color: "bg-slate-300" }]); return; }
      try {
        const raw = localStorage.getItem(`budget_segments_goal_${goalId}`);
        const rawActuals = localStorage.getItem(`budget_actuals_goal_${goalId}`);
        if (rawActuals) {
          try { const parsedActuals = JSON.parse(rawActuals || "{}"); setOverrides(parsedActuals || {}); const sel: Record<string, boolean> = {}; Object.keys(parsedActuals || {}).forEach((k) => { sel[String(k)] = true; }); setSelected((s) => ({ ...s, ...sel })); } catch (e) {}
        }
        if (raw) {
          const parsed = JSON.parse(raw);
          const parsedNorm = (parsed || []).map((b: any) => ({ id: String(b.id), label: b.label ?? "", amount: Math.max(0, Math.round(Number(b.amount) || 0)), color: b.color ?? "bg-slate-300" }));
          // ensure unalloc
          const non = parsedNorm.filter((b: any) => b.id !== "unalloc");
          const sum = non.reduce((s: number, b: any) => s + b.amount, 0);
          const next = non.concat([{ id: "unalloc", label: "Unallocated", amount: Math.max(0, total - sum), color: "bg-slate-300" }]);
          setBudgets(next);
        } else {
          setBudgets([{ id: "unalloc", label: "Unallocated", amount: total, color: "bg-slate-300" }]);
        }
      } catch (e) {
        setBudgets([{ id: "unalloc", label: "Unallocated", amount: total, color: "bg-slate-300" }]);
      }
    }

    load();

    function onBudgetUpdate(e: any) {
      try {
        const detail = e?.detail;
        if (!detail) return;
        if (String(detail.goalId) !== String(goalId)) return;
        const parsed = detail.budgets || [];
        const parsedNorm = (parsed || []).map((b: any) => ({ id: String(b.id), label: b.label ?? "", amount: Math.max(0, Math.round(Number(b.amount) || 0)), color: b.color ?? "bg-slate-300" }));
        const non = parsedNorm.filter((b: any) => b.id !== "unalloc");
        const sum = non.reduce((s: number, b: any) => s + b.amount, 0);
        const next = non.concat([{ id: "unalloc", label: "Unallocated", amount: Math.max(0, total - sum), color: "bg-slate-300" }]);
        setBudgets(next);
      } catch (err) {
        // ignore
      }
    }

    window.addEventListener("budget_segments_updated", onBudgetUpdate as EventListener);

    // listen for actual overrides updates as well
    function onActualsUpdate(e: any) {
      try {
        const detail = e?.detail;
        if (!detail) return;
        if (String(detail.goalId) !== String(goalId)) return;
        const parsed = detail.actuals || {};
        setOverrides(parsed ?? {});
        // set selected based on overrides present
        const sel: Record<string, boolean> = {};
        Object.keys(parsed || {}).forEach((k) => { sel[String(k)] = true; });
        setSelected((s) => ({ ...s, ...sel }));
      } catch (err) {}
    }

    window.addEventListener("budget_actuals_updated", onActualsUpdate as EventListener);

    return () => {
      window.removeEventListener("budget_segments_updated", onBudgetUpdate as EventListener);
      window.removeEventListener("budget_actuals_updated", onActualsUpdate as EventListener);
    };
  }, [goalId, total]);

  function persistAndNotify(budgetsToSave: any[]) {
    if (!goalId) return;
    try {
      localStorage.setItem(`budget_segments_goal_${goalId}`, JSON.stringify(budgetsToSave));
      try { window.dispatchEvent(new CustomEvent("budget_segments_updated", { detail: { goalId, budgets: budgetsToSave } })); } catch (e) {}
    } catch (e) {}
  }

  function persistActualsAndNotify(actuals: Record<string, number>) {
    if (!goalId) return;
    try {
      localStorage.setItem(`budget_actuals_goal_${goalId}`, JSON.stringify(actuals));
      try { window.dispatchEvent(new CustomEvent("budget_actuals_updated", { detail: { goalId, actuals } })); } catch (e) {}
    } catch (e) {}
  }

  // modal states for marking actuals
  const [modalOpen, setModalOpen] = useState(false);
  const [modalItem, setModalItem] = useState<{ id: string; label: string; amount: number } | null>(null);
  const [modalMode, setModalMode] = useState<'choose' | 'enter'>('choose');
  const [modalInput, setModalInput] = useState<string>('0');
  const [modalError, setModalError] = useState<string>('');

  async function onToggle(id: string) {
    if (id === 'unalloc') return; // unallocated row should not be toggleable
    const currently = !!selected[id];
    if (currently) {
      // user is unchecking -> remove override if present
      const copy = { ...overrides };
      if (copy.hasOwnProperty(id)) {
        delete copy[id];
        setOverrides(copy);
        persistActualsAndNotify(copy);
      }
      setSelected((s) => ({ ...s, [id]: false }));
      return;
    }

    // otherwise open modal to choose actions
    const item = budgets.find((b) => b.id === id);
    const budgetAmt = item ? item.amount : 0;
    setModalItem(item ? { id: item.id, label: item.label, amount: item.amount } : { id, label: id, amount: 0 });
    setModalInput(String(budgetAmt));
    setModalMode('choose');
    setModalError('');
    setModalOpen(true);
  }

  function closeModal(cancelled = true) {
    setModalOpen(false);
    setModalMode('choose');
    setModalError('');
    if (cancelled && modalItem) {
      // ensure checkbox not checked
      setSelected((s) => ({ ...s, [String(modalItem.id)]: false }));
    }
    setModalItem(null);
    setModalInput('0');
  }

  function handleUseBudgetAsActual() {
    if (!modalItem) return closeModal(true);
    const next = { ...overrides, [modalItem.id]: Math.max(0, Math.round(Number(modalItem.amount) || 0)) };
    setOverrides(next);
    persistActualsAndNotify(next);
    setSelected((s) => ({ ...s, [modalItem.id]: true }));
    closeModal(false);
  }

  function handleEnterActualSave() {
    if (!modalItem) return closeModal(true);
    const parsed = Number(modalInput);
    if (Number.isNaN(parsed) || parsed < 0) {
      setModalError('Please enter a valid non-negative number');
      return;
    }
    const value = Math.max(0, Math.round(parsed));
    const next = { ...overrides, [modalItem.id]: value };
    setOverrides(next);
    persistActualsAndNotify(next);
    setSelected((s) => ({ ...s, [modalItem.id]: true }));
    closeModal(false);
  }

  function onAmountChange(id: string, raw: number) {
    const v = Math.max(0, Math.round(raw || 0));
    const idx = budgets.findIndex((b) => b.id === id);
    if (idx === -1) return;
    const copy = budgets.map((b) => ({ ...b }));
    const unallocIdx = copy.findIndex((b) => b.id === "unalloc");
    if (id === "unalloc") {
      // editing unalloc: clamp to total - sum(non-unalloc)
      const nonSum = copy.filter((b) => b.id !== "unalloc").reduce((s, b) => s + b.amount, 0);
      const maxUnalloc = Math.max(0, total - nonSum);
      const newUnalloc = Math.min(v, maxUnalloc);
      copy[unallocIdx].amount = newUnalloc;
    } else {
      const old = copy[idx].amount;
      const delta = v - old;
      // if increasing, ensure unalloc can cover
      const available = copy[unallocIdx]?.amount ?? 0;
      if (delta > 0 && available < delta) {
        // cap increase
        copy[idx].amount = old + available;
        copy[unallocIdx].amount = 0;
      } else {
        copy[idx].amount = v;
        if (unallocIdx !== -1) copy[unallocIdx].amount = Math.max(0, (copy[unallocIdx].amount ?? 0) - delta);
      }
    }
    // normalization safeguard: ensure sums don't exceed total
    const nonSum2 = copy.filter((b) => b.id !== "unalloc").reduce((s, b) => s + b.amount, 0);
    if (nonSum2 > total) {
      // scale down proportionally
      const scale = total / nonSum2;
      const scaled = copy.filter((b) => b.id !== "unalloc").map((b) => ({ ...b, amount: Math.max(0, Math.round(b.amount * scale)) }));
      const scaledSum = scaled.reduce((s, b) => s + b.amount, 0);
      const remainder = Math.max(0, total - scaledSum);
      const final = scaled.concat([{ id: "unalloc", label: "Unallocated", amount: remainder, color: "bg-slate-300" }]);
      setBudgets(final);
      persistAndNotify(final);
    } else {
      setBudgets(copy);
      persistAndNotify(copy);
    }
  }

  function actualSpentFor(id: string, label: string) {
    try {
      // prefer override if present by id
      if (overrides && typeof overrides[String(id)] !== "undefined") return Math.round(Number(overrides[String(id)]) || 0);
      if (!transactions) return 0;
      const lower = (label || "").toLowerCase();
      // sum of negative amounts (spending) where name contains label
      const sum = transactions.reduce((s, t) => {
        const name = (t.name || "").toLowerCase();
        if (lower && name.includes(lower) && t.amount < 0) return s + Math.abs(t.amount);
        return s;
      }, 0);
      return Math.round(sum);
    } catch (e) {
      return 0;
    }
  }

  return (
    <section className="mt-6 rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-bold text-slate-900">Budget segments</h3>
        <span className="text-xs text-slate-500">Manage budget items</span>
      </div>

      <div className="mt-4 overflow-x-auto">
        <table className="min-w-full text-sm">
          <thead>
            <tr className="text-left text-xs text-slate-500">
              <th className="pr-4"> </th>
              <th className="pr-4">Item</th>
              <th className="pr-4">Budget Amount</th>
              <th className="pr-4">Actual Spent</th>
              <th className="pr-4">Remainder</th>
            </tr>
          </thead>
          <tbody>
            {budgets.map((b) => {
              const actual = actualSpentFor(b.id, b.label);
              const remainder = Math.max(0, b.amount - actual);
              return (
                <tr key={b.id} className="border-t border-slate-100">
                  {b.id === 'unalloc' ? (
                    <td className="py-2 pr-4"> </td>
                  ) : (
                    <td className="py-2 pr-4"><input type="checkbox" checked={!!selected[b.id]} onChange={() => onToggle(b.id)} /></td>
                  )}
                  <td className="py-2 pr-4 text-slate-700">{b.label}</td>
                  <td className="py-2 pr-4">
                    <input type="number" value={b.amount} onChange={(e) => onAmountChange(b.id, Number(e.target.value))} className="w-32 rounded border border-slate-200 px-2 py-1 text-sm" />
                  </td>
                  <td className="py-2 pr-4 text-rose-700">{formatCurrency(actual, currency)}</td>
                  <td className="py-2 pr-4 text-slate-700">{formatCurrency(remainder, currency)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* modal for marking actuals */}
      <Modal open={modalOpen} title={modalItem ? `Mark "${modalItem.label}" as spent` : undefined} onClose={() => closeModal(true)}>
        <div className="space-y-4">
          {modalItem && (
            <>
              {modalMode === 'choose' ? (
                <>
                  <p className="text-sm text-slate-700">Choose how to mark <strong className="text-slate-900">{modalItem.label}</strong>:</p>
                  <div className="flex items-center gap-3">
                    <button onClick={handleUseBudgetAsActual} className="rounded bg-emerald-600 px-3 py-2 text-sm font-medium text-white hover:bg-emerald-700">Use budget amount ({formatCurrency(modalItem.amount, currency)})</button>
                    <button onClick={() => setModalMode('enter')} className="rounded border border-slate-200 px-3 py-2 text-sm">Enter actual amount</button>
                    <button onClick={() => closeModal(true)} className="ml-auto text-sm text-slate-500">Cancel</button>
                  </div>
                </>
              ) : (
                <>
                  <p className="text-sm text-slate-700">Enter actual spent amount for <strong className="text-slate-900">{modalItem.label}</strong>:</p>
                  <div>
                    <input autoFocus type="number" value={modalInput} onChange={(e) => setModalInput(e.target.value)} className="w-40 rounded border border-slate-200 px-2 py-1 text-sm" />
                    {modalError ? <div className="mt-2 text-xs text-rose-600">{modalError}</div> : null}
                  </div>
                  <div className="flex items-center gap-3">
                    <button onClick={handleEnterActualSave} className="rounded bg-emerald-600 px-3 py-2 text-sm font-medium text-white hover:bg-emerald-700">Save</button>
                    <button onClick={() => { setModalMode('choose'); setModalError(''); }} className="rounded border border-slate-200 px-3 py-2 text-sm">Back</button>
                    <button onClick={() => closeModal(true)} className="ml-auto text-sm text-slate-500">Cancel</button>
                  </div>
                </>
              )}
            </>
          )}
        </div>
      </Modal>

    </section>
  );
}
