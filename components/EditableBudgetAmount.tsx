"use client";

import { saveCategoryBudget } from "@/app/categories/actions";
import { useRouter } from "next/navigation";
import { useRef, useState, useTransition } from "react";

function formatCurrency(value: number, currency: string) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: currency || "SGD" }).format(value);
}

type EditableBudgetAmountProps = {
  monthCategoryId: number;
  monthKey: string;
  amount: number;
  currency: string;
  disabled?: boolean;
};

export default function EditableBudgetAmount({ monthCategoryId, monthKey, amount, currency, disabled = false }: EditableBudgetAmountProps) {
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState(String(amount));
  const [selectedCurrency, setSelectedCurrency] = useState(currency || "SGD");
  const [isPending, startTransition] = useTransition();
  const committing = useRef(false);
  const router = useRouter();

  const startEditing = () => {
    setValue(String(amount));
    setSelectedCurrency(currency || "SGD");
    setEditing(true);
  };

  const revertEdit = () => {
    if (committing.current) return;
    setValue(String(amount));
    setSelectedCurrency(currency || "SGD");
    setEditing(false);
  };

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    committing.current = true;
    const formData = new FormData();
    formData.append("monthCategoryId", String(monthCategoryId));
    formData.append("monthKey", monthKey);
    formData.append("amount", value);
    formData.append("currency", selectedCurrency);
    startTransition(async () => {
      await saveCategoryBudget(formData);
      setEditing(false);
      committing.current = false;
      router.refresh();
    });
  };

  if (editing) {
    return <form onSubmit={handleSubmit} onBlur={(event) => { if (!event.currentTarget.contains(event.relatedTarget as Node | null)) revertEdit(); }} onKeyDown={(event) => { if (event.key === "Escape") { event.preventDefault(); revertEdit(); } }} className="flex items-center justify-end gap-1"><select autoFocus value={selectedCurrency} onChange={(event) => setSelectedCurrency(event.target.value)} disabled={isPending} className="h-7 rounded border border-slate-200 bg-white px-1 text-[10px] text-slate-700 outline-none"><option>SGD</option><option>USD</option><option>EUR</option></select><input type="number" min="0" step="0.01" value={value} onChange={(event) => setValue(event.target.value)} disabled={isPending} className="h-7 w-20 rounded border border-blue-300 px-2 text-right text-[11px] text-slate-800 outline-none ring-2 ring-blue-100" /></form>;
  }

  if (disabled) {
    return <span className="rounded px-1 text-left text-slate-400" aria-label={`Inactive budget ${formatCurrency(amount, currency)}`}>{formatCurrency(amount, currency)}</span>;
  }

  return <button type="button" onClick={startEditing} className="rounded px-1 text-left text-slate-600 transition hover:bg-blue-50 hover:text-blue-700" aria-label={`Edit budget ${formatCurrency(amount, currency)}`}>{formatCurrency(amount, currency)}</button>;
}
