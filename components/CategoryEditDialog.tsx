"use client";

import { archiveCategory, unarchiveCategory, updateCategory } from "@/app/categories/actions";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { CategoryFields } from "@/components/QuickAddForms";
import { defaultIconValue } from "@/lib/icon-options";
import StandardDialog from "@/components/StandardDialog";

export type CategoryEditFormProps = {
  category: {
    id: number;
    name: string;
    type: string;
    icon: string | null;
    sortOrder: number;
    monthlyBudget: number;
    monthlyBudgetCurrency: string;
    archived?: boolean;
  };
  onSaved?: () => void;
  onArchived?: () => void;
  onUnarchived?: () => void;
};

export function CategoryEditForm({ category, onSaved, onArchived, onUnarchived }: CategoryEditFormProps) {
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    startTransition(async () => {
      await updateCategory(formData);
      router.refresh();
      onSaved?.();
    });
  };

  const handleArchive = () => {
    const formData = new FormData();
    formData.append("id", String(category.id));
    startTransition(async () => {
      await archiveCategory(formData);
      router.refresh();
      onArchived?.();
    });
  };

  const handleUnarchive = () => {
    const formData = new FormData();
    formData.append("id", String(category.id));
    startTransition(async () => {
      await unarchiveCategory(formData);
      router.refresh();
      onUnarchived?.();
    });
  };

  return (
    <>
      <form onSubmit={handleSubmit} className="space-y-5">
        <input type="hidden" name="id" value={category.id} />
        <input type="hidden" name="sortOrder" value={category.sortOrder} />
        <CategoryFields
          defaultType={category.type === "Income" ? "Income" : "Expense"}
          defaultName={category.name}
          defaultIcon={category.icon || defaultIconValue}
          defaultBudgetAmount={category.monthlyBudget}
          defaultBudgetCurrency={category.monthlyBudgetCurrency}
          budgetMode="monthly"
          showBudget={category.type === "Expense"}
        />
        <div className="flex items-center justify-between gap-3 pt-1">
          {category.archived ? <button type="button" onClick={handleUnarchive} disabled={isPending} className="rounded-lg bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-emerald-700 disabled:opacity-60">Unarchive</button> : <button type="button" onClick={handleArchive} disabled={isPending} className="rounded-lg bg-rose-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-rose-700 disabled:opacity-60">Archive</button>}
          <button type="submit" data-dialog-submit disabled={isPending} className="rounded-lg bg-slate-950 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:opacity-60">{isPending ? "Saving..." : "Save changes"}</button>
        </div>
      </form>
      {isPending ? <div className="pointer-events-none fixed inset-0 z-[60] bg-white/20" aria-hidden="true" /> : null}
    </>
  );
}

export default function CategoryEditDialog({ category, trigger }: { category: CategoryEditFormProps["category"]; trigger?: (onOpen: () => void) => React.ReactNode }) {
  const [open, setOpen] = useState(false);
  const router = useRouter();

  return (
    <>
      {trigger ? trigger(() => setOpen(true)) : <button type="button" onClick={() => setOpen(true)} className="flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-slate-800 shadow-sm transition hover:border-slate-300">
        <span aria-hidden="true">↗</span> Edit category
      </button>}
      {open ? (
        <StandardDialog title="Edit category" description="Update this category for the current month." variant="category" onClose={() => setOpen(false)}>
          <CategoryEditForm category={category} onSaved={() => setOpen(false)} onArchived={() => router.push("/categories")} onUnarchived={() => setOpen(false)} />
        </StandardDialog>
      ) : null}
    </>
  );
}
