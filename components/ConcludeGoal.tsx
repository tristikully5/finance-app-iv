"use client";

import React, { useRef, useState } from "react";
import Modal from "./Modal";

export default function ConcludeGoal({ action, undoAction, goalId, goalName, allocated, spentProp, currency, isConcluded, accounts = [] }: { action: (formData: FormData) => Promise<void> | void; undoAction?: (formData: FormData) => Promise<void> | void; goalId: number; goalName: string; allocated: number; spentProp: number; currency?: string; isConcluded?: boolean; accounts?: Array<{ id: number; name: string }> }) {
  const readStoredActual = () => {
    try {
      const raw = localStorage.getItem(`budget_actuals_goal_${goalId}`) || "{}";
      const parsed = JSON.parse(raw || "{}");
      const values = Object.values(parsed || {}).map((v) => Number(v) || 0);
      const total = values.reduce((sum, value) => sum + value, 0);
      return Math.max(Math.round(spentProp || 0), Math.max(0, Math.round(total)));
    } catch {
      return Math.max(0, Math.round(spentProp || 0));
    }
  };

  const [open, setOpen] = useState(false);
  const [undoOpen, setUndoOpen] = useState(false);
  const [actual, setActual] = useState<number>(readStoredActual);
  const [error, setError] = useState<string | null>(null);
  const [selectedAccountId, setSelectedAccountId] = useState<string>(accounts[0]?.id ? String(accounts[0].id) : "");
  const formRef = useRef<HTMLFormElement | null>(null);

  function refreshActualsFromStorage() {
    setActual(readStoredActual());
  }

  function openModal() {
    if (isConcluded) return;
    setError(null);
    refreshActualsFromStorage();
    setOpen(true);
  }

  function closeModal() {
    setOpen(false);
  }

  function closeUndoModal() {
    setUndoOpen(false);
  }

  async function handleUndo() {
    if (!undoAction) return;
    const formData = new FormData();
    formData.append("goalId", String(goalId));
    await undoAction(formData);
    setUndoOpen(false);
  }

  const overspend = Math.max(0, actual - allocated);

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    if (actual <= 0) {
      event.preventDefault();
      setError("Actual spent must be greater than zero.");
      return;
    }

    setError(null);
    setOpen(false);
  }

  return (
    <div className="mt-6">
      {isConcluded ? (
        <button onClick={() => setUndoOpen(true)} className="inline-flex h-10 items-center gap-2 rounded-lg border border-slate-200 bg-slate-100 px-3 text-sm font-semibold text-slate-700 shadow-sm hover:border-slate-300 hover:bg-slate-200">Concluded</button>
      ) : (
        <button onClick={openModal} className="inline-flex h-10 items-center gap-2 rounded-lg border border-rose-600 bg-rose-600 px-3 text-sm font-semibold text-white shadow-sm hover:bg-rose-700">Conclude Goal</button>
      )}

      <Modal open={open} title={`Conclude "${goalName}"`} onClose={closeModal}>
        <form ref={formRef} action={action} onSubmit={handleSubmit} className="space-y-4">
          <input type="hidden" name="goalId" value={String(goalId)} />
          <input type="hidden" name="actualSpent" value={String(actual)} />
          <input type="hidden" name="overspendAmount" value={String(overspend)} />
          <input type="hidden" name="overspendAccountId" value={String(selectedAccountId || "")} />

          <p className="text-sm text-slate-700">
            {overspend > 0
              ? `Final spent exceeds the total allocated by ${new Intl.NumberFormat("en-US", { style: "currency", currency: currency || "SGD", minimumFractionDigits: 2 }).format(overspend)}. You can save the final amount now and optionally create a new allocation for the overage from an account.`
              : "This will finalize the goal and keep the current allocation history intact. The goal will be marked concluded without changing the original allocation records."}
          </p>

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
            <input type="number" value={actual} onChange={(event) => setActual(Math.max(0, Math.round(Number(event.target.value) || 0)))} className="w-40 rounded border border-slate-200 px-2 py-1 text-sm" />
          </div>

          {overspend > 0 ? (
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-600">Account for overspend</label>
              <select value={selectedAccountId} onChange={(event) => setSelectedAccountId(event.target.value)} className="w-full rounded border border-slate-200 px-2 py-1.5 text-sm">
                <option value="">Select account</option>
                {accounts.map((account) => (
                  <option key={account.id} value={String(account.id)}>{account.name}</option>
                ))}
              </select>
            </div>
          ) : null}

          {error ? <div className="text-xs text-rose-600">{error}</div> : null}

          <div className="flex items-center gap-3">
            <button type="submit" className="rounded bg-emerald-600 px-3 py-2 text-sm font-medium text-white hover:bg-emerald-700">Confirm and Conclude</button>
            <button type="button" onClick={closeModal} className="rounded border border-slate-200 px-3 py-2 text-sm">Cancel</button>
          </div>
        </form>
      </Modal>

      <Modal open={undoOpen} title={`Undo conclusion for "${goalName}"`} onClose={closeUndoModal}>
        <div className="space-y-4">
          <p className="text-sm text-slate-700">
            Undoing this conclusion will restore the goal to an active status, reset the allocation conclusion states, and remove any overspend top-up created during the previous conclusion.
          </p>
          <div className="flex items-center gap-3">
            <button type="button" onClick={handleUndo} className="rounded bg-amber-600 px-3 py-2 text-sm font-medium text-white hover:bg-amber-700">Undo conclusion</button>
            <button type="button" onClick={closeUndoModal} className="rounded border border-slate-200 px-3 py-2 text-sm">Cancel</button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
