"use client";

import { createAccount } from "@/app/accounts/actions";
import { createCategory } from "@/app/categories/actions";
import { createGoal } from "@/app/goals/actions";
import { createTransaction } from "@/app/transactions/actions";
import AmountInput from "@/components/AmountInput";
import IconPicker from "@/components/IconPicker";
import IconSelect from "@/components/IconSelect";
import { useRouter } from "next/navigation";
import { defaultIconValue, getCategoryTypeDefaultColorValue, getCategoryTypeDefaultIconValue, getDefaultIconValue } from "@/lib/icon-options";
import { useEffect, useMemo, useState, useTransition } from "react";

type AccountOption = { id: number; name: string; icon?: string | null };
type CategoryOption = { id: number; name: string; type: string; icon?: string | null };
type GoalOption = { id: number; name: string; icon?: string | null };

function FieldRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="grid grid-cols-[5rem_minmax(0,1fr)] items-center gap-3">
      <label className="text-xs font-medium text-slate-700">{label}</label>
      {children}
    </div>
  );
}

export function QuickAddAccountForm({ onDone }: { onDone?: () => void }) {
  const [isPending, startTransition] = useTransition();
  const [defaultAccountIcon, setDefaultAccountIcon] = useState(defaultIconValue);

  useEffect(() => {
    setDefaultAccountIcon(getDefaultIconValue());
  }, []);

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = event.currentTarget;
    const formData = new FormData(form);
    // Ensure optional description and tags are forwarded when present in the form state

    startTransition(async () => {
      await createAccount(formData);
      onDone?.();
      form.reset();
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <div className="flex items-start gap-3">
        <IconPicker name="icon" defaultValue={defaultAccountIcon} type="Account" />
        <input name="name" placeholder="Account name" className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100" required />
      </div>
      <FieldRow label="Type">
        <select name="type" className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100" defaultValue="Bank">
          <option>Bank</option>
          <option>Cash</option>
          <option>Credit Card</option>
          <option>Investment</option>
        </select>
      </FieldRow>
      <FieldRow label="Currency">
        <select name="currency" className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100" defaultValue="SGD">
          <option>SGD</option>
          <option>USD</option>
          <option>EUR</option>
        </select>
      </FieldRow>
      <div className="flex justify-end pt-1">
        <button disabled={isPending} className="rounded-lg bg-slate-950 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:opacity-60">
          {isPending ? "Saving..." : "Save"}
        </button>
      </div>
    </form>
  );
}

type CategoryFieldsProps = {
  defaultType: "Expense" | "Income";
  defaultName?: string;
  defaultIcon?: string;
  defaultBudgetAmount?: number;
  defaultBudgetCurrency?: string;
  budgetMode?: "default" | "monthly";
  showBudget?: boolean;
  showType?: boolean;
};

export function CategoryFields({ defaultType, defaultName = "", defaultIcon, defaultBudgetAmount = 0, defaultBudgetCurrency = "SGD", budgetMode = "default", showBudget = true, showType = true }: CategoryFieldsProps) {
  const [selectedType, setSelectedType] = useState<"Expense" | "Income">(defaultType);
  const [defaultCategoryIcon, setDefaultCategoryIcon] = useState(defaultIconValue);
  const [selectedColor, setSelectedColor] = useState<string>(getCategoryTypeDefaultColorValue(defaultType));
  const budgetAmountName = budgetMode === "monthly" ? "budgetAmount" : "defaultBudgetAmount";
  const budgetCurrencyName = budgetMode === "monthly" ? "budgetCurrency" : "defaultBudgetCurrency";

  useEffect(() => {
    const nextType = selectedType === "Expense" ? "Expense" : "Income";
    setDefaultCategoryIcon(nextType === "Expense" ? getCategoryTypeDefaultIconValue("Expense") : getCategoryTypeDefaultIconValue("Income"));
    setSelectedColor(getCategoryTypeDefaultColorValue(nextType));
  }, [selectedType]);

  const selectedDefaultIcon = defaultIcon ?? defaultCategoryIcon ?? defaultIconValue;
  return (
    <div className="space-y-5">
      <div className="flex items-start gap-3">
        <IconPicker name="icon" defaultValue={selectedDefaultIcon} type={selectedType} />
        <div className="min-w-0 flex-1">
          <input type="hidden" name="color" value={selectedColor} />
          <input name="name" defaultValue={defaultName} placeholder="Category name" aria-label="Category name" className="w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-blue-400 focus:ring-2 focus:ring-blue-100" required />
          <p className="mt-2 text-xs text-slate-500">Click the name or icon to edit</p>
        </div>
      </div>

      {showType ? <fieldset>
        <legend className="text-xs font-semibold text-slate-700">Type</legend>
        <div className="mt-2 grid grid-cols-2 gap-2">
          <label className="relative cursor-pointer">
            <input type="radio" name="type" value="Expense" checked={selectedType === "Expense"} onChange={() => setSelectedType("Expense")} className="peer sr-only" />
            <span className="flex items-center justify-center gap-2 rounded-lg border border-slate-200 px-3 py-2.5 text-xs font-medium text-slate-700 transition peer-checked:border-slate-800 peer-checked:text-slate-900"><span className="text-rose-500">⌄</span>Expense</span>
          </label>
          <label className="relative cursor-pointer">
            <input type="radio" name="type" value="Income" checked={selectedType === "Income"} onChange={() => setSelectedType("Income")} className="peer sr-only" />
            <span className="flex items-center justify-center gap-2 rounded-lg border border-slate-200 px-3 py-2.5 text-xs font-medium text-slate-700 transition peer-checked:border-slate-800 peer-checked:text-slate-900"><span className="text-emerald-500">↑</span>Income</span>
          </label>
        </div>
      </fieldset> : <input type="hidden" name="type" value={defaultType} />}

      {showBudget ? <div>
        <p className="text-xs font-semibold text-slate-700">{budgetMode === "monthly" ? "Monthly budget" : "Default budget (template)"}</p>
        <div className="mt-2 grid grid-cols-[7.5rem_minmax(0,1fr)] gap-2">
          <select name={budgetCurrencyName} className="rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100" defaultValue={defaultBudgetCurrency}><option>SGD</option><option>USD</option><option>EUR</option></select>
          <AmountInput name={budgetAmountName} defaultValue={defaultBudgetAmount || 0} placeholder="0.00" className="rounded-lg border border-slate-200 px-3 py-2.5 text-sm text-slate-900 outline-none placeholder:text-slate-400 focus:border-blue-400 focus:ring-2 focus:ring-blue-100" />
        </div>
        <p className="mt-2 text-xs leading-5 text-slate-500">{budgetMode === "monthly" ? "This budget applies directly to the current month." : <>This amount will be used as the default budget<br />when a new month is created.</>}</p>
      </div> : null}
    </div>
  );
}

export function QuickAddCategoryForm({ onDone, defaultType = "Expense" }: { onDone?: () => void; defaultType?: "Expense" | "Income" }) {
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = event.currentTarget;
    const formData = new FormData(form);

    startTransition(async () => {
      await createCategory(formData);
      router.refresh();
      onDone?.();
      form.reset();
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <CategoryFields defaultType={defaultType} showType={false} showBudget={defaultType === "Expense"} />
      <div className="flex justify-end pt-1">
        <button disabled={isPending} className="rounded-lg bg-slate-950 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:opacity-60">{isPending ? "Saving..." : "Save"}</button>
      </div>
    </form>
  );
}

export function QuickAddGoalForm({ onDone }: { onDone?: () => void }) {
  const [isPending, startTransition] = useTransition();
  const [description, setDescription] = useState("");
  const [defaultGoalIcon, setDefaultGoalIcon] = useState(defaultIconValue);
  const router = useRouter();

  useEffect(() => {
    setDefaultGoalIcon(getDefaultIconValue());
  }, []);

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = event.currentTarget;
    const formData = new FormData(form);

    startTransition(async () => {
      await createGoal(formData);
      router.refresh();
      onDone?.();
      form.reset();
      setDescription("");
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <div className="flex items-start gap-3">
        <IconPicker name="icon" defaultValue={defaultGoalIcon} type="Goal" />
        <input name="name" placeholder="Goal name" aria-label="Goal name" className="w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm text-slate-900 outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100" required />
      </div>
      <FieldRow label="Date">
        <input name="targetDate" type="date" className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100" />
      </FieldRow>
      <label className="block text-xs font-medium text-slate-700">
        <span className="block">Description <span className="font-normal italic text-slate-500">(optional)</span></span>
        <textarea name="description" value={description} onChange={(event) => setDescription(event.target.value)} maxLength={200} rows={4} className="mt-2 w-full resize-none rounded-lg border border-slate-200 px-3 py-2.5 text-sm text-slate-900 outline-none placeholder:text-slate-400 focus:border-blue-400 focus:ring-2 focus:ring-blue-100" />
        <span className="mt-1 block text-right text-[10px] font-normal text-slate-500">{description.length} / 200</span>
      </label>
      <FieldRow label="Amount">
        <div className="grid grid-cols-[minmax(0,1fr)_6rem] gap-2">
          <AmountInput name="amount" defaultValue={0} placeholder="0.00" className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100" required />
          <select name="currency" className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100" defaultValue="SGD">
            <option>SGD</option>
            <option>USD</option>
            <option>EUR</option>
          </select>
        </div>
      </FieldRow>
      <div className="flex justify-end pt-1">
        <button disabled={isPending} className="rounded-lg bg-slate-950 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:opacity-60">
          {isPending ? "Saving..." : "Save"}
        </button>
      </div>
    </form>
  );
}

export function QuickAddTransactionForm({
  onDone,
  accounts,
  categories,
  goals,
}: {
  onDone?: () => void;
  accounts?: AccountOption[];
  categories?: CategoryOption[];
  goals?: GoalOption[];
}) {
  const [isPending, startTransition] = useTransition();
  const [selectedType, setSelectedType] = useState<"Expense" | "Income" | "Transfer">("Expense");
  const [fromAccountId, setFromAccountId] = useState<string>("");
  const [selectedToAccountId, setSelectedToAccountId] = useState<string>("");
  const [selectedGoalId, setSelectedGoalId] = useState<string>("");

  const filteredCategories = useMemo(
    () => (categories ?? []).filter((category) => category.type === selectedType),
    [categories, selectedType]
  );

  const destinationAccounts = useMemo(
    () => (accounts ?? []).filter((account) => String(account.id) !== fromAccountId),
    [accounts, fromAccountId]
  );

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = event.currentTarget;
    const formData = new FormData(form);

    startTransition(async () => {
      await createTransaction(formData);
      onDone?.();
      form.reset();
      setSelectedType("Expense");
      setFromAccountId("");
      setSelectedToAccountId("");
      setSelectedGoalId("");
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <FieldRow label="Type">
        <div className="inline-flex w-full rounded-lg border border-slate-200 bg-white p-1">
          {[
            { label: "Income", value: "Income" },
            { label: "Expense", value: "Expense" },
            { label: "Transfer", value: "Transfer" },
          ].map((option) => (
            <button
              key={option.value}
              type="button"
              onClick={() => setSelectedType(option.value as "Expense" | "Income" | "Transfer")}
              className={`flex-1 rounded-md px-2 py-2 text-xs font-semibold transition ${selectedType === option.value ? option.value === "Income" ? "bg-emerald-50 text-emerald-700" : option.value === "Expense" ? "bg-rose-50 text-rose-700" : "bg-violet-50 text-violet-700" : "text-slate-500 hover:bg-slate-50"}`}
            >
              <span className="mr-1">{option.value === "Income" ? "↑" : option.value === "Expense" ? "↓" : "↔"}</span>{option.label}
            </button>
          ))}
        </div>
        <input type="hidden" name="type" value={selectedType} />
      </FieldRow>

      <FieldRow label="Date">
        <input name="date" type="date" defaultValue={new Date().toISOString().slice(0, 10)} className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100" />
      </FieldRow>
      <FieldRow label="Amount">
        <div className="grid w-full grid-cols-3 gap-2">
          <AmountInput name="amount" defaultValue={0} placeholder="Amount" className="col-span-2 w-full rounded border p-2" />
          <select name="currency" className="col-span-1 w-full rounded border p-2" defaultValue="SGD">
            <option>SGD</option>
            <option>USD</option>
            <option>EUR</option>
          </select>
        </div>
      </FieldRow>

      {selectedType === "Transfer" ? (
        <>
          <FieldRow label="Category">
            <input value="Transfer (auto)" disabled className="w-full rounded border border-slate-200 bg-slate-50 p-2 text-slate-500" />
          </FieldRow>
          <FieldRow label="From">
            <IconSelect
              name="fromAccountId"
              value={fromAccountId}
              onChange={(v) => setFromAccountId(v)}
              options={[{ value: "", label: "Select source account" }].concat((accounts ?? []).map((account) => ({ value: String(account.id), label: account.name, icon: (account as any).icon })))}
              required
            />
          </FieldRow>
          <FieldRow label="Destination">
            <div className="grid grid-cols-2 gap-2">
              <IconSelect
                name="toAccountId"
                value={selectedToAccountId}
                onChange={(v) => { setSelectedToAccountId(v); if (v) setSelectedGoalId(""); }}
                options={[{ value: "", label: "To account" }].concat((destinationAccounts ?? []).map((account) => ({ value: String(account.id), label: account.name, icon: (account as any).icon })))}
              />

              <IconSelect
                name="goalId"
                value={selectedGoalId}
                onChange={(v) => { setSelectedGoalId(v); if (v) setSelectedToAccountId(""); }}
                options={[{ value: "", label: "Goal allocation" }].concat((goals ?? []).map((goal) => ({ value: String(goal.id), label: goal.name, icon: (goal as any).icon })))}
              />
            </div>
          </FieldRow>
          <FieldRow label="Name">
            <input name="name" placeholder="Optional note" className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100" />
          </FieldRow>
          <FieldRow label="Description">
            <textarea name="description" placeholder="More details about the transaction" className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100" />
          </FieldRow>
          <FieldRow label="Tags">
            <input name="tags" placeholder="comma,separated,tags" className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100" />
          </FieldRow>
        </>
      ) : (
        <>
          <FieldRow label="Category">
            <IconSelect
              name="monthCategoryId"
              defaultValue={filteredCategories[0] ? String(filteredCategories[0].id) : ""}
              options={filteredCategories.length === 0 ? [{ value: "", label: `No ${selectedType.toLowerCase()} categories` }] : filteredCategories.map((category) => ({ value: String(category.id), label: category.name, icon: (category as any).icon }))}
              required={filteredCategories.length > 0}
            />
          </FieldRow>
          <FieldRow label="Account">
            <IconSelect
              name="accountId"
              options={[{ value: "", label: "Select account" }].concat((accounts ?? []).map((account) => ({ value: String(account.id), label: account.name, icon: (account as any).icon })))}
              required
            />
          </FieldRow>
          <FieldRow label="Name">
            <input name="name" placeholder="Optional note" className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100" />
          </FieldRow>
        </>
      )}
      <div className="flex justify-end pt-1">
        <button disabled={isPending} className="rounded-lg bg-slate-950 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:opacity-60">
          {isPending ? "Saving..." : "Save"}
        </button>
      </div>
    </form>
  );
}
