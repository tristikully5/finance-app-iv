"use client";

import { createAccount } from "@/app/accounts/actions";
import { createCategory } from "@/app/categories/actions";
import { createGoal } from "@/app/goals/actions";
import { createTransaction } from "@/app/transactions/actions";
import AmountInput from "@/components/AmountInput";
import IconPicker from "@/components/IconPicker";
import TransactionDialogFields, { type TransactionType } from "@/components/TransactionDialogFields";
import { transactionDialogPresets, type TransactionDialogPreset } from "@/components/transaction-dialog-presets";
import { useRouter } from "next/navigation";
import { defaultIconValue, getCategoryTypeDefaultColorValue, getCategoryTypeDefaultIconValue, getDefaultIconValue } from "@/lib/icon-options";
import { useEffect, useState, useTransition } from "react";

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
  accounts = [],
  categories = [],
  goals = [],
  tagSuggestions = [],
  preset = transactionDialogPresets.add,
}: {
  onDone?: () => void;
  accounts?: AccountOption[];
  categories?: CategoryOption[];
  goals?: GoalOption[];
  tagSuggestions?: string[];
  preset?: TransactionDialogPreset;
}) {
  const [isPending, startTransition] = useTransition();
  const [selectedType, setSelectedType] = useState<TransactionType>("Expense");
  const [selectedAccountId, setSelectedAccountId] = useState("");
  const [selectedToAccountId, setSelectedToAccountId] = useState("");
  const [selectedGoalId, setSelectedGoalId] = useState("");
  const [description, setDescription] = useState("");
  const [tags, setTags] = useState<string[]>([]);

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = event.currentTarget;
    const formData = new FormData(form);

    startTransition(async () => {
      await createTransaction(formData);
      onDone?.();
      form.reset();
      setSelectedType("Expense");
      setSelectedAccountId("");
      setSelectedToAccountId("");
      setSelectedGoalId("");
      setDescription("");
      setTags([]);
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <TransactionDialogFields
        preset={preset}
        mode="add"
        selectedType={selectedType}
        onTypeChange={(type) => {
          setSelectedType(type);
          setSelectedToAccountId("");
          setSelectedGoalId("");
        }}
        accounts={accounts}
        categories={categories}
        goals={goals}
        selectedAccountId={selectedAccountId}
        onAccountChange={setSelectedAccountId}
        selectedToAccountId={selectedToAccountId}
        onToAccountChange={(value) => {
          setSelectedToAccountId(value);
          setSelectedGoalId("");
        }}
        selectedGoalId={selectedGoalId}
        onGoalChange={(value) => {
          setSelectedGoalId(value);
          setSelectedToAccountId("");
        }}
        description={description}
        onDescriptionChange={setDescription}
        tags={tags}
        tagSuggestions={tagSuggestions}
        onTagsChange={setTags}
      />
      <div className="mt-5 flex justify-end pt-1">
        <button disabled={isPending} className="rounded-lg bg-slate-950 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:opacity-60">
          {isPending ? "Saving..." : "Save"}
        </button>
      </div>
    </form>
  );
}
