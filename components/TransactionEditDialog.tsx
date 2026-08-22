import { deleteTransaction, updateTransaction } from "@/app/transactions/actions";
import StandardDialog from "@/components/StandardDialog";
import TransactionDialogFields, { type TransactionType } from "@/components/TransactionDialogFields";
import { transactionDialogPresets, type TransactionDialogPreset } from "@/components/transaction-dialog-presets";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

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
  tagSuggestions?: string[];
  onClose: () => void;
  preset?: TransactionDialogPreset;
};

export default function TransactionEditDialog({ transaction, accounts, categories, goals, tagSuggestions = [], onClose, preset = transactionDialogPresets.edit }: TransactionEditDialogProps) {
  const [isPending, startTransition] = useTransition();
  const [selectedType, setSelectedType] = useState<TransactionType>(transaction.type as TransactionType);
  const [selectedAccountId, setSelectedAccountId] = useState(String(transaction.accountId));
  const [selectedToAccountId, setSelectedToAccountId] = useState(transaction.toAccountId ? String(transaction.toAccountId) : "");
  const [selectedGoalId, setSelectedGoalId] = useState(transaction.goalId ? String(transaction.goalId) : "");
  const [description, setDescription] = useState(transaction.description ?? "");
  const [tags, setTags] = useState<string[]>(transaction.tags ?? []);
  const router = useRouter();

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    formData.set("description", description);
    formData.set("tags", JSON.stringify(tags));
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
    <StandardDialog title="Edit transaction" onClose={onClose}>
      <form onSubmit={handleSubmit} className="space-y-3">
        <input type="hidden" name="id" value={transaction.id} />
        <TransactionDialogFields
          preset={preset}
          mode="edit"
          transaction={transaction}
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
        <div className="mt-5 flex items-center justify-between gap-3 pt-1">
          {preset.showDelete ? (
            <button type="button" onClick={handleDelete} disabled={isPending} className="rounded-lg border border-rose-200 bg-rose-50 px-4 py-2.5 text-sm font-semibold text-rose-700 transition hover:border-rose-300 hover:bg-rose-100 disabled:opacity-60">Delete</button>
          ) : <span />}
          <button disabled={isPending} className="rounded-lg bg-slate-950 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:opacity-60">{isPending ? "Saving..." : "Save changes"}</button>
        </div>
      </form>
    </StandardDialog>
  );
}
