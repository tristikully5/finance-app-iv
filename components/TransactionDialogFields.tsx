import AmountInput from "@/components/AmountInput";
import IconSelect from "@/components/IconSelect";
import MonthCalendarPicker from "@/components/MonthCalendarPicker";
import TagInput from "@/components/TagInput";
import type { TransactionDialogPreset } from "@/components/transaction-dialog-presets";

export type TransactionType = "Expense" | "Income" | "Transfer" | "Allocate";

type AccountOption = { id: number; name: string; icon?: string | null };
type CategoryOption = { id: number; name: string; type: string; icon?: string | null };
type GoalOption = { id: number; name: string; icon?: string | null };

type TransactionDialogFieldsProps = {
  preset: TransactionDialogPreset;
  mode: "add" | "edit";
  selectedType: TransactionType;
  onTypeChange: (type: TransactionType) => void;
  accounts: AccountOption[];
  categories: CategoryOption[];
  goals: GoalOption[];
  selectedAccountId: string;
  onAccountChange: (value: string) => void;
  selectedToAccountId: string;
  onToAccountChange: (value: string) => void;
  selectedGoalId: string;
  onGoalChange: (value: string) => void;
  dateValue: string;
  onDateChange: (value: string) => void;
  transaction?: {
    date: string;
    amount: number;
    currency: string;
    accountId: number;
    toAccountId: number | null;
    goalId: number | null;
    monthCategoryId: number;
    category?: CategoryOption;
    name: string;
    description?: string;
    tags?: string[];
  };
  description: string;
  onDescriptionChange: (value: string) => void;
  tags: string[];
  tagSuggestions?: string[];
  onTagsChange: (tags: string[]) => void;
};

function FieldRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="grid grid-cols-[5rem_minmax(0,1fr)] items-center gap-3">
      <label className="text-xs font-medium text-slate-700">{label}</label>
      {children}
    </div>
  );
}

const typeOptions: Array<{ label: string; value: TransactionType; icon: string }> = [
  { label: "Income", value: "Income", icon: "↑" },
  { label: "Expense", value: "Expense", icon: "↓" },
  { label: "Transfer", value: "Transfer", icon: "↔" },
  { label: "Allocate", value: "Allocate", icon: "◎" },
];

export default function TransactionDialogFields({
  preset,
  mode,
  selectedType,
  onTypeChange,
  accounts,
  categories,
  goals,
  selectedAccountId,
  onAccountChange,
  selectedToAccountId,
  onToAccountChange,
  selectedGoalId,
  onGoalChange,
  dateValue,
  onDateChange,
  transaction,
  description,
  onDescriptionChange,
  tags,
  tagSuggestions = [],
  onTagsChange,
}: TransactionDialogFieldsProps) {
  const filteredCategories = categories.filter((category) => category.type === selectedType);
  const transactionCategory = transaction?.category ?? categories.find((category) => category.id === transaction?.monthCategoryId);
  const categoryOptions = transactionCategory && transactionCategory.type === selectedType && !filteredCategories.some((category) => category.id === transactionCategory.id)
    ? [transactionCategory, ...filteredCategories]
    : filteredCategories;
  const destinationAccounts = accounts.filter((account) => String(account.id) !== selectedAccountId);
  const sourceFieldName = mode === "add" ? "fromAccountId" : "accountId";
  const inputClassName = "w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-violet-400 focus:ring-2 focus:ring-violet-100";
  const selectClassName = "w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none transition focus:border-violet-400 focus:ring-2 focus:ring-violet-100";

  return (
    <>
      {preset.showType ? (
        <FieldRow label="Type">
          <div className="inline-flex w-full rounded-lg border border-slate-200 bg-white p-1">
            {typeOptions.map((option) => {
              const isSelected = selectedType === option.value;
              const selectedClass = option.value === "Income"
                ? "bg-emerald-50 text-emerald-700"
                : option.value === "Expense"
                  ? "bg-rose-50 text-rose-700"
                  : option.value === "Transfer"
                    ? "bg-violet-50 text-violet-700"
                    : "bg-violet-50 text-violet-700";

              return (
                <button key={option.value} type="button" data-transaction-type={option.value} data-selected={isSelected ? "true" : "false"} onClick={() => onTypeChange(option.value)} className={`flex min-w-0 flex-1 items-center justify-center gap-1 rounded-md px-2 py-2 text-[11px] font-semibold transition ${isSelected ? selectedClass : "text-slate-500 hover:bg-slate-50"}`}>
                  <span aria-hidden="true">{option.icon}</span>
                  <span className="truncate">{option.label}</span>
                </button>
              );
            })}
          </div>
          <input type="hidden" name="type" value={selectedType} />
        </FieldRow>
      ) : <input type="hidden" name="type" value={selectedType} />}

      {preset.showDate ? (
        <FieldRow label="Date">
          <MonthCalendarPicker
            mode="date"
            dateValue={dateValue}
            onDateChange={onDateChange}
            className={`${inputClassName} flex items-center justify-start gap-2 text-left`}
          />
        </FieldRow>
      ) : null}

      {preset.showAmount ? (
        <FieldRow label="Amount">
          <div className="grid w-full grid-cols-[minmax(0,1fr)_5.25rem] gap-2">
            <AmountInput name="amount" defaultValue={transaction ? Math.abs(transaction.amount) : 0} placeholder="0.00" required className={inputClassName} />
            <select name="currency" defaultValue={transaction?.currency ?? "SGD"} className={selectClassName}>
              <option>SGD</option>
              <option>USD</option>
              <option>EUR</option>
            </select>
          </div>
        </FieldRow>
      ) : null}

      {preset.showCategory && (selectedType === "Transfer" || selectedType === "Allocate") ? (
        <FieldRow label="Category">
          <input value={selectedType === "Transfer" ? "Transfer (auto)" : "Allocate (auto)"} disabled className={`${inputClassName} bg-slate-50 text-slate-500`} readOnly />
        </FieldRow>
      ) : null}

      {selectedType === "Transfer" && preset.showDestination ? (
        <div className="grid grid-cols-[5rem_minmax(0,1fr)] items-center gap-3">
          <label className="text-xs font-medium text-slate-700">Destination</label>
          <div className="flex min-w-0 items-center gap-2">
            <div className="min-w-0 flex-1">
              <div className="mb-1 text-[10px] font-semibold uppercase tracking-wide text-slate-500">From</div>
              <IconSelect name={sourceFieldName} value={selectedAccountId} onChange={onAccountChange} options={[{ value: "", label: "From account" }].concat(accounts.map((account) => ({ value: String(account.id), label: account.name, icon: account.icon })))} required />
            </div>
            <span className="mt-4 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-violet-50 text-violet-700" aria-hidden="true">
              <svg viewBox="0 0 16 16" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M1.75 8h10.5M9.75 4.75 13 8l-3.25 3.25" strokeLinecap="round" strokeLinejoin="round" /></svg>
            </span>
            <div className="min-w-0 flex-1">
              <div className="mb-1 text-[10px] font-semibold uppercase tracking-wide text-slate-500">To</div>
              <IconSelect name="toAccountId" value={selectedToAccountId} onChange={onToAccountChange} options={[{ value: "", label: "To account" }].concat(destinationAccounts.map((account) => ({ value: String(account.id), label: account.name, icon: account.icon })))} required />
            </div>
          </div>
        </div>
      ) : null}

      {selectedType === "Allocate" && preset.showDestination ? (
        <div className="grid grid-cols-[5rem_minmax(0,1fr)] items-center gap-3">
          <label className="text-xs font-medium text-slate-700">Destination</label>
          <div className="flex min-w-0 items-center gap-2">
            <div className="min-w-0 flex-1">
              <div className="mb-1 text-[10px] font-semibold uppercase tracking-wide text-slate-500">From</div>
              <IconSelect name={sourceFieldName} value={selectedAccountId} onChange={onAccountChange} options={[{ value: "", label: "From account" }].concat(accounts.map((account) => ({ value: String(account.id), label: account.name, icon: account.icon })))} required />
            </div>
            <span className="mt-4 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-violet-50 text-violet-700" aria-hidden="true">
              <svg viewBox="0 0 16 16" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M1.75 8h10.5M9.75 4.75 13 8l-3.25 3.25" strokeLinecap="round" strokeLinejoin="round" /></svg>
            </span>
            <div className="min-w-0 flex-1">
              <div className="mb-1 text-[10px] font-semibold uppercase tracking-wide text-slate-500">Goal</div>
              <IconSelect name="goalId" value={selectedGoalId} onChange={onGoalChange} options={[{ value: "", label: "Select goal" }].concat(goals.map((goal) => ({ value: String(goal.id), label: goal.name, icon: goal.icon })))} required />
            </div>
          </div>
        </div>
      ) : null}

      {preset.showCategory && selectedType !== "Transfer" && selectedType !== "Allocate" ? (
        <FieldRow label="Category">
          <IconSelect name="monthCategoryId" defaultValue={transaction?.monthCategoryId ? String(transaction.monthCategoryId) : (categoryOptions[0]?.id ? String(categoryOptions[0].id) : "")} options={categoryOptions.length === 0 ? [{ value: "", label: `No ${selectedType.toLowerCase()} categories` }] : categoryOptions.map((category) => ({ value: String(category.id), label: category.name, icon: category.icon }))} required={categoryOptions.length > 0} />
        </FieldRow>
      ) : null}

      {preset.showAccount && selectedType !== "Transfer" && selectedType !== "Allocate" ? (
        <FieldRow label="Account">
          <IconSelect name="accountId" value={selectedAccountId} onChange={onAccountChange} options={[{ value: "", label: "Select account" }].concat(accounts.map((account) => ({ value: String(account.id), label: account.name, icon: account.icon })))} required />
        </FieldRow>
      ) : null}

      {preset.showName ? (
        <FieldRow label="Name">
          <input name="name" defaultValue={transaction?.name} placeholder="Optional note" className={inputClassName} />
        </FieldRow>
      ) : null}

      {preset.showDescription ? (
        <FieldRow label="Description">
          <textarea name="description" value={description} onChange={(event) => onDescriptionChange(event.target.value)} placeholder="More details about the transaction" rows={2} className={`${inputClassName} min-h-16 resize-none`} />
        </FieldRow>
      ) : null}

      {preset.showTags ? (
        <FieldRow label="Tags">
          <TagInput name="tags" tags={tags} suggestions={tagSuggestions} onChange={onTagsChange} />
        </FieldRow>
      ) : null}
    </>
  );
}
