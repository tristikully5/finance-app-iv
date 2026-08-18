"use client";

import { deleteTransaction, updateTransaction } from "@/app/transactions/actions";
import { useRouter } from "next/navigation";
import { useMemo, useState, useTransition } from "react";
import AmountInput from "@/components/AmountInput";
import IconSelect from "@/components/IconSelect";

type TransactionType = "Expense" | "Income" | "Transfer";

type TransactionEditDialogProps = {
  transaction: {
    id: number;
    date: string;
    name: string;
    amount: number;
    currency: string;
    type: string;
    accountId: number;
    toAccountId: number | null;
    goalId: number | null;
    monthCategoryId: number;
    description?: string;
    tags?: string[];
  };
  accounts: Array<{ id: number; name: string; icon?: string | null }>;
  categories: Array<{ id: number; name: string; type: string; icon?: string | null }>;
  goals: Array<{ id: number; name: string; icon?: string | null }>;
  onClose: () => void;
};

export default function TransactionEditDialog({ transaction, accounts, categories, goals, onClose }: TransactionEditDialogProps) {
  const [isPending, startTransition] = useTransition();
  const [selectedType, setSelectedType] = useState<TransactionType>(transaction.type as TransactionType);
  const [selectedAccountId, setSelectedAccountId] = useState(String(transaction.accountId));
  const [selectedToAccountId, setSelectedToAccountId] = useState(transaction.toAccountId ? String(transaction.toAccountId) : "");
  const [selectedGoalId, setSelectedGoalId] = useState(transaction.goalId ? String(transaction.goalId) : "");
  const [description, setDescription] = useState(transaction.description ?? "");
  const [tagsValue, setTagsValue] = useState((transaction.tags ?? []).join(","));
  const router = useRouter();

  const filteredCategories = useMemo(
    () => categories.filter((category) => category.type === selectedType),
    [categories, selectedType]
  );
  const destinationAccounts = useMemo(
    () => accounts.filter((account) => String(account.id) !== selectedAccountId),
    [accounts, selectedAccountId]
  );

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    formData.set("description", description);
    formData.set("tags", tagsValue);
    startTransition(async () => {
      await updateTransaction(formData);
      onClose();
      router.refresh();
    });
  };

  const handleDelete = () => {
    const formData = new FormData();
    formData.append("id", String(transaction.id));
    startTransition(async () => {
      await deleteTransaction(formData);
      onClose();
      router.refresh();
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/25 p-4 backdrop-blur-[1px]" onClick={onClose}>
      <div className="w-full max-w-lg rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl" onClick={(event) => event.stopPropagation()}>
        <div className="mb-5 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3"><span className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-50 text-blue-600">▧</span><h2 className="text-xl font-bold text-slate-950">Edit transaction</h2></div>
          <button type="button" onClick={onClose} className="text-xl leading-none text-slate-400 transition hover:text-slate-700" aria-label="Close dialog">×</button>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          <input type="hidden" name="id" value={transaction.id} />
          <label className="transaction-dialog-field">Type
            <div className="inline-flex w-full rounded-lg border border-slate-200 bg-white p-1">
              {[
                { label: "Income", value: "Income" as const },
                { label: "Expense", value: "Expense" as const },
                { label: "Transfer", value: "Transfer" as const },
              ].map((option) => (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => setSelectedType(option.value)}
                  className={`flex-1 rounded-md px-2 py-2 text-xs font-semibold transition ${selectedType === option.value ? option.value === "Income" ? "bg-emerald-50 text-emerald-700" : option.value === "Expense" ? "bg-rose-50 text-rose-700" : "bg-violet-50 text-violet-700" : "text-slate-500 hover:bg-slate-50"}`}
                >
                  <span className="mr-1">{option.value === "Income" ? "↑" : option.value === "Expense" ? "↓" : "↔"}</span>{option.label}
                </button>
              ))}
            </div>
            <input type="hidden" name="type" value={selectedType} />
          </label>
          <label className="transaction-dialog-field">Date<input name="date" type="date" defaultValue={transaction.date.slice(0, 10)} required /></label>
          <label className="transaction-dialog-field">Amount<div className="grid grid-cols-[minmax(0,1fr)_6rem] gap-2"><AmountInput name="amount" defaultValue={Math.abs(transaction.amount)} required className="w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm text-slate-900 outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100" /><select name="currency" defaultValue={transaction.currency}><option>SGD</option><option>USD</option><option>EUR</option></select></div></label>
          {selectedType === "Transfer" ? (
            <>
              <label className="transaction-dialog-field">Category<input value="Transfer (auto)" disabled /></label>
              <label className="transaction-dialog-field">From
                <IconSelect
                  name="accountId"
                  value={selectedAccountId}
                  onChange={(v) => setSelectedAccountId(v)}
                  options={accounts.map((account) => ({ value: String(account.id), label: account.name, icon: (account as any).icon }))}
                  required
                />
              </label>
              <label className="transaction-dialog-field">Destination
                <div className="grid grid-cols-2 gap-2">
                  <IconSelect
                    name="toAccountId"
                    value={selectedToAccountId}
                    onChange={(v) => { setSelectedToAccountId(v); if (v) setSelectedGoalId(""); }}
                    options={[{ value: "", label: "To account" }].concat(destinationAccounts.map((account) => ({ value: String(account.id), label: account.name, icon: (account as any).icon })))}
                  />
                  <IconSelect
                    name="goalId"
                    value={selectedGoalId}
                    onChange={(v) => { setSelectedGoalId(v); if (v) setSelectedToAccountId(""); }}
                    options={[{ value: "", label: "Goal allocation" }].concat(goals.map((goal) => ({ value: String(goal.id), label: goal.name, icon: (goal as any).icon })))}
                  />
                </div>
              </label>
            </>
          ) : (
            <>
              <label className="transaction-dialog-field">Category
                <IconSelect
                  name="monthCategoryId"
                  defaultValue={filteredCategories.some((category) => category.id === transaction.monthCategoryId) ? String(transaction.monthCategoryId) : (filteredCategories[0]?.id ? String(filteredCategories[0].id) : "")}
                  options={filteredCategories.length === 0 ? [{ value: "", label: `No ${selectedType.toLowerCase()} categories` }] : filteredCategories.map((category) => ({ value: String(category.id), label: category.name, icon: (category as any).icon }))}
                  required={filteredCategories.length > 0}
                />
              </label>
              <label className="transaction-dialog-field">Account
                <IconSelect
                  name="accountId"
                  defaultValue={String(transaction.accountId)}
                  options={accounts.map((account) => ({ value: String(account.id), label: account.name, icon: (account as any).icon }))}
                  required
                />
              </label>
            </>
          )}
          <label className="transaction-dialog-field">Name<input name="name" defaultValue={transaction.name} placeholder="Optional note" /></label>
          <label className="transaction-dialog-field">Description<textarea name="description" value={description} onChange={(e) => setDescription(e.target.value)} placeholder="More details about the transaction" /></label>
          <label className="transaction-dialog-field">Tags<input name="tags" value={tagsValue} onChange={(e) => setTagsValue(e.target.value)} placeholder="comma,separated,tags" /></label>
          <div className="flex items-center justify-between gap-3 pt-2"><button type="button" onClick={handleDelete} disabled={isPending} className="rounded-lg bg-rose-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-rose-700 disabled:opacity-60">Delete</button><button disabled={isPending} className="rounded-lg bg-slate-950 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:opacity-60">{isPending ? "Saving..." : "Save changes"}</button></div>
        </form>
      </div>
    </div>
  );
}
