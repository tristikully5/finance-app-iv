"use client";

import React, { useEffect, useRef, useState } from "react";
import Modal from "./Modal";

export default function ConcludeGoal({ action, goalId, goalName, allocated, spentProp, currency, isConcluded }: { action: any; goalId: number; goalName: string; allocated: number; spentProp: number; currency?: string; isConcluded?: boolean }) {
  const [open, setOpen] = useState(false);
  const [actual, setActual] = useState<number>(Math.max(0, Math.round(spentProp || 0)));
  const [actualsSum, setActualsSum] = useState<number>(0);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const formRef = useRef<HTMLFormElement | null>(null);

  function refreshActualsFromStorage() {
    try {
      const raw = localStorage.getItem(`budget_actuals_goal_${goalId}`) || "{}";
      const parsed = JSON.parse(raw || "{}");
      const values = Object.values(parsed || {}).map((v) => Number(v) || 0);
      const s = values.reduce((a, b) => a + b, 0);
      const roundedS = Math.max(0, Math.round(s));
      setActualsSum(roundedS);
      // Use the reconciled displayed spent (the larger of transaction-derived spentProp or manual actuals)
      const display = Math.max(Math.round(spentProp || 0), roundedS);
      setActual(display);
    } catch (e) {
      // ignore
    }
  }

  useEffect(() => {
    refreshActualsFromStorage();
  }, [goalId, spentProp]);

  function openModal() {
    if (isConcluded) return;
    setError(null);
    // refresh just before opening to ensure the modal shows the latest total spent
    refreshActualsFromStorage();
    setOpen(true);
  }

  function closeModal() {
    if (submitting) return; // prevent closing while submitting
    setOpen(false);
  }

  function onConfirm() {
    if (actual <= 0) {
      setError("Actual spent must be greater than zero.");
      return;
    }
    if (actual > allocated) {
      setError("Actual spent exceeds allocated total. Please top up allocations before concluding.");
      return;
    }
    setError(null);

    if (formRef.current) {
      setSubmitting(true);
      const f = formRef.current as HTMLFormElement;
      const actualInput = f.querySelector("input[name='actualSpent']") as HTMLInputElement;
      if (actualInput) actualInput.value = String(actual);
      (f as any).requestSubmit?.();
      setOpen(false);
    }
  }

  return (
    <div className="mt-6">
      {isConcluded ? (
        <button disabled className="inline-flex h-10 items-center gap-2 rounded-lg border border-slate-200 bg-slate-100 px-3 text-sm font-semibold text-slate-500 shadow-sm">Concluded</button>
      ) : (
        <button onClick={openModal} className="inline-flex h-10 items-center gap-2 rounded-lg border border-rose-600 bg-rose-600 px-3 text-sm font-semibold text-white shadow-sm hover:bg-rose-700">Conclude Goal</button>
      )}

      <Modal open={open} title={`Conclude "${goalName}"`} onClose={closeModal}>
        <form ref={formRef} action={action}>
          <input type="hidden" name="goalId" value={String(goalId)} />
          <input type="hidden" name="actualSpent" value={String(actual)} />
        </form>

        <div className="space-y-4">
          <p className="text-sm text-slate-700">This will finalize the goal and clear all allocations reserved for it. The goal will be marked concluded without creating a separate expense transaction.</p>

          <div className="grid gap-3 sm:grid-cols-2">
            <div className="rounded-md border border-slate-100 bg-white p-3">
              <div className="text-xs text-slate-500">Allocated total</div>
              <div className="mt-1 font-semibold text-slate-900">{new Intl.NumberFormat("en-US", { style: "currency", currency: currency || "SGD", minimumFractionDigits: 2 }).format(allocated)}</div>
            </div>

            <div className="rounded-md border border-slate-100 bg-white p-3">
              <div className="text-xs text-slate-500">Final amount</div>
              <div className="mt-1 font-semibold text-rose-700">{new Intl.NumberFormat("en-US", { style: "currency", currency: currency || "SGD", minimumFractionDigits: 2 }).format(actual)}</div>
            </div>
          </div>

          <div>
            <label className="mb-1 block text-xs font-medium text-slate-600">Final amount</label>
            <input type="number" value={actual} onChange={(e) => setActual(Math.max(0, Math.round(Number(e.target.value) || 0)))} className="w-40 rounded border border-slate-200 px-2 py-1 text-sm" />
          </div>

          {error ? <div className="text-xs text-rose-600">{error}</div> : null}

          <div className="flex items-center gap-3">
            <button type="button" onClick={onConfirm} disabled={submitting} className={`rounded px-3 py-2 text-sm font-medium text-white ${submitting ? 'bg-emerald-400' : 'bg-emerald-600 hover:bg-emerald-700'}`}>{submitting ? 'Saving...' : 'Confirm and Conclude'}</button>
            <button type="button" onClick={closeModal} className="rounded border border-slate-200 px-3 py-2 text-sm">Cancel</button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
