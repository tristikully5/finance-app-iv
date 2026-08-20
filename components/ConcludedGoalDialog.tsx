"use client";

import React from "react";
import Modal from "./Modal";
import IconDisplay from "./IconDisplay";

export default function ConcludedGoalDialog({ transaction, onClose }: { transaction: any; onClose: () => void }) {
  if (!transaction) return null;
  return (
    <Modal open={true} title={`Concluded Goal: ${transaction.name}`} onClose={onClose}>
      <div className="space-y-4">
        <div className="flex items-center gap-3">
          <span className="flex h-10 w-10 items-center justify-center rounded-md bg-rose-50 text-rose-600">
            <IconDisplay icon={transaction.category?.icon || ""} className="h-5 w-5" />
          </span>
          <div>
            <div className="text-sm font-semibold text-slate-900">{transaction.name}</div>
            <div className="text-xs text-slate-500">Concluded goal transaction</div>
          </div>
        </div>

        <div className="grid gap-2 sm:grid-cols-2">
          <div className="rounded-md border border-slate-100 bg-white p-3">
            <div className="text-xs text-slate-500">Amount</div>
            <div className="mt-1 font-semibold text-rose-700">{transaction.amount < 0 ? `- ${transaction.currency} ${Math.abs(transaction.amount).toFixed(2)}` : `${transaction.currency} ${transaction.amount.toFixed(2)}`}</div>
          </div>

          <div className="rounded-md border border-slate-100 bg-white p-3">
            <div className="text-xs text-slate-500">Account</div>
            <div className="mt-1 font-semibold text-slate-900">{transaction.account?.name || 'Account'}</div>
          </div>
        </div>

        <div className="rounded-md border border-slate-100 bg-white p-3">
          <div className="text-xs text-slate-500">Notes</div>
          <div className="mt-1 text-sm text-slate-700">{transaction.description || "Concluded via goal conclude action"}</div>
        </div>

        <div className="flex items-center gap-3">
          <a href={`/goals/${transaction.goalId}`} className="rounded border border-slate-200 px-3 py-2 text-sm">View Goal</a>
          <button onClick={onClose} className="ml-auto rounded border border-slate-200 px-3 py-2 text-sm">Close</button>
        </div>
      </div>
    </Modal>
  );
}
