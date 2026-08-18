"use client";

import { useState } from "react";
import EditableCard from "@/components/EditableCard";
import IconDisplay from "@/components/IconDisplay";
import QuickAddShell from "@/app/components/QuickAddShell";
import CategoryEditDialog, { CategoryEditForm } from "@/components/CategoryEditDialog";

type CategoryCardItem = {
  id: number;
  name: string;
  type: string;
  icon: string | null;
  sortOrder: number;
  monthlyTotal: number;
  monthlyCurrency: string;
  monthlyBudget: number;
  monthlyBudgetCurrency: string;
  defaultBudgetAmount: number;
  defaultBudgetCurrency: string;
};

type CategoriesBoardProps = {
  expenses: CategoryCardItem[];
  incomes: CategoryCardItem[];
  archivedExpenses: CategoryCardItem[];
  archivedIncomes: CategoryCardItem[];
  selectedMonthKey: string;
  selectedMonthLabel: string;
};

function formatCurrency(value: number, currency: string) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: currency || "USD",
  }).format(value);
}

function moveItem<T>(items: T[], from: number, to: number): T[] {
  const next = [...items];
  const [moved] = next.splice(from, 1);
  next.splice(to, 0, moved);
  return next;
}

function CategoryAddTile({ type }: { type: "Expense" | "Income" }) {
  const label = type === "Expense" ? "Expense" : "Income";

  return (
    <div className="min-h-40">
      <QuickAddShell
        kind="category"
        categoryType={type}
        buttonClassName="group flex h-full min-h-40 w-full flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-slate-300 bg-white text-slate-600 transition hover:border-slate-400 hover:bg-slate-50"
        buttonContent={<><span className="flex h-7 w-7 items-center justify-center rounded-full bg-slate-100 text-xl font-light text-slate-500 transition group-hover:bg-slate-200">+</span><span className="text-xs font-medium">Add {label}</span></>}
      />
    </div>
  );
}

function CategoryMetrics({ category }: { category: CategoryCardItem }) {
  const isExpense = category.type === "Expense";
  const spentPercent = category.monthlyBudget > 0 ? Math.min((category.monthlyTotal / category.monthlyBudget) * 100, 100) : 0;
  const remainingPercent = category.monthlyBudget > 0 ? Math.max(100 - spentPercent, 0) : 0;

  if (!isExpense) {
    return (
      <div className="pt-1">
        <p className="text-[10px] font-medium uppercase tracking-wide text-slate-500">Earned this month</p>
        <p className="mt-1 text-sm font-bold text-slate-950">{formatCurrency(category.monthlyTotal, category.monthlyCurrency)}</p>
      </div>
    );
  }

  return (
    <div className="space-y-3 pt-1">
      <div className="grid grid-cols-2 gap-2">
        <div>
          <p className="text-[10px] font-medium uppercase tracking-wide text-slate-500">Spent this month</p>
          <p className="mt-1 text-sm font-bold text-slate-950">{formatCurrency(category.monthlyTotal, category.monthlyCurrency)}</p>
        </div>
        <div className="text-right">
          <p className="text-[10px] font-medium uppercase tracking-wide text-slate-500">Budget</p>
          <p className="mt-1 text-sm font-bold text-slate-950">{formatCurrency(category.monthlyBudget, category.monthlyBudgetCurrency)}</p>
        </div>
      </div>
      <div className="flex items-center gap-2">
        <progress className="category-progress category-progress-expense" value={remainingPercent} max="100" aria-label={`${Math.round(remainingPercent)}% of monthly budget remaining`} />
        <span className="w-7 text-right text-[10px] font-medium text-slate-600">{Math.round(remainingPercent)}%</span>
      </div>
    </div>
  );
}

function ArchivedCategorySection({ categories }: { categories: CategoryCardItem[] }) {
  const [open, setOpen] = useState(false);

  if (categories.length === 0) {
    return null;
  }

  return (
    <section className="border-t border-slate-200 pt-5">
      <button type="button" onClick={() => setOpen((current) => !current)} className="flex w-full items-center justify-between text-left" aria-expanded={open}>
        <span>
          <span className="text-sm font-bold text-slate-950">Archived categories</span>
          <span className="ml-2 text-xs text-slate-500">{categories.length}</span>
        </span>
        <span className={`text-xs text-slate-500 transition-transform ${open ? "rotate-90" : ""}`} aria-hidden="true">›</span>
      </button>
      {open ? (
        <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {categories.map((category) => (
            <CategoryEditDialog
              key={category.id}
              category={{ id: category.id, name: category.name, type: category.type, icon: category.icon, sortOrder: category.sortOrder, monthlyBudget: category.monthlyBudget, monthlyBudgetCurrency: category.monthlyBudgetCurrency, archived: true }}
              trigger={(onOpen) => (
                <button type="button" onClick={onOpen} className="w-full rounded-xl border border-slate-200 bg-slate-50 p-4 text-left text-slate-400 transition hover:border-slate-300 hover:bg-slate-100">
                  <span className="flex items-center gap-3">
                    <span className={`flex h-8 w-8 items-center justify-center rounded-md ${category.type === "Income" ? "bg-emerald-50" : "bg-rose-50"}`}><IconDisplay icon={category.icon} className="h-4 w-4 object-contain opacity-50" /></span>
                    <span className="min-w-0"><span className="block truncate text-sm font-semibold text-slate-500">{category.name}</span><span className="mt-0.5 block text-[10px] uppercase tracking-wide text-slate-400">Archived</span></span>
                  </span>
                </button>
              )}
            />
          ))}
        </div>
      ) : null}
    </section>
  );
}

function DraggableCategorySection({ title, categories }: { title: "Expenses" | "Income"; categories: CategoryCardItem[] }) {
  const [ordered, setOrdered] = useState(categories);
  const [draggingId, setDraggingId] = useState<number | null>(null);
  const type = title === "Expenses" ? "Expense" : "Income";
  const accent = type === "Expense" ? "bg-rose-50 text-rose-600" : "bg-emerald-50 text-emerald-600";

  const handleDrop = (targetId: number) => {
    if (!draggingId || draggingId === targetId) return;
    const from = ordered.findIndex((item) => item.id === draggingId);
    const to = ordered.findIndex((item) => item.id === targetId);
    if (from < 0 || to < 0) return setDraggingId(null);
    setOrdered((current) => moveItem(current, from, to));
    setDraggingId(null);
  };

  return (
    <section>
      <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <span className={`flex h-7 w-7 items-center justify-center rounded-md ${accent}`} aria-hidden="true">{type === "Expense" ? "↓" : "↑"}</span>
          <h2 className="text-sm font-bold text-slate-950">{title}</h2>
        </div>
        <span className="text-xs text-slate-500">{ordered.length} categories</span>
      </div>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {ordered.map((category) => (
          <div key={category.id} draggable onDragStart={() => setDraggingId(category.id)} onDragOver={(event) => event.preventDefault()} onDrop={() => handleDrop(category.id)} onDragEnd={() => setDraggingId(null)} className={draggingId === category.id ? "cursor-grabbing opacity-60" : "cursor-grab"}>
            <EditableCard
              title={category.name}
              headerContent={<div className={`flex h-8 w-8 items-center justify-center rounded-md ${accent}`}><IconDisplay icon={category.icon} className="h-4 w-4 object-contain text-base" /></div>}
              cardHref={`/categories/${category.id}`}
              className="h-full min-h-0 !p-3"
              modalTitle="Edit category"
              editContent={<CategoryEditForm category={{ id: category.id, name: category.name, type: category.type, icon: category.icon, sortOrder: category.sortOrder, monthlyBudget: category.monthlyBudget, monthlyBudgetCurrency: category.monthlyBudgetCurrency }} />}
            >
              <CategoryMetrics category={category} />
            </EditableCard>
          </div>
        ))}
        <CategoryAddTile type={type} />
      </div>
    </section>
  );
}

export default function CategoriesBoard({ expenses, incomes, archivedExpenses, archivedIncomes }: CategoriesBoardProps) {
  const archivedCategories = [...archivedExpenses, ...archivedIncomes];
  const categoryStateKey = (categories: CategoryCardItem[]) => categories.map((category) => `${category.id}:${category.name}:${category.icon ?? ""}`).join("|");
  return <div className="space-y-7"><DraggableCategorySection key={categoryStateKey(expenses)} title="Expenses" categories={expenses} /><DraggableCategorySection key={categoryStateKey(incomes)} title="Income" categories={incomes} /><ArchivedCategorySection categories={archivedCategories} /></div>;
}
