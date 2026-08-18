"use client";

import { archiveCategory } from "@/app/categories/actions";
import { useEffect, useState, useTransition } from "react";
import { createPortal } from "react-dom";
import EditableBudgetAmount from "@/components/EditableBudgetAmount";
import IconDisplay from "@/components/IconDisplay";
import QuickAddShell from "@/app/components/QuickAddShell";
import { useRouter } from "next/navigation";
import type { BudgetOverviewCategory } from "@/components/BudgetOverview";

type BudgetCategoryRowsProps = {
  categories: BudgetOverviewCategory[];
  monthKey?: string;
  variant: "expense" | "income";
};

type ContextMenuState = {
  categoryId: number;
  top: number;
  left: number;
};

function formatCurrency(value: number, currency: string) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: currency || "SGD" }).format(value);
}

function remainingPercent(spent: number, budget: number) {
  if (budget <= 0) return 0;
  const spentPercent = Math.round((spent / budget) * 100);
  return Math.max(100 - spentPercent, 0);
}

function progressColor(index: number) {
  return ["bg-rose-400", "bg-amber-400", "bg-blue-400", "bg-red-400", "bg-violet-400"][index % 5];
}

function CategoryIcon({ category }: { category: BudgetOverviewCategory }) {
  const tone = `${category.type === "Income" ? "bg-emerald-50 text-emerald-600" : "bg-rose-50 text-rose-500"} ${category.isActive ? "" : "opacity-50"}`;
  return <span className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-md ${tone}`}><IconDisplay icon={category.icon} className="h-3.5 w-3.5 object-contain text-sm" /></span>;
}

function BudgetCategoryContextMenu({ menu, category, onDelete, isPending }: { menu: ContextMenuState; category: BudgetOverviewCategory; onDelete: () => void; isPending: boolean }) {
  return createPortal(
    <div
      className="budget-category-context-menu"
      style={{ top: menu.top, left: menu.left }}
      role="menu"
      aria-label={`Actions for ${category.name}`}
      onMouseDown={(event) => event.stopPropagation()}
    >
      <button type="button" role="menuitem" onClick={onDelete} disabled={isPending}>
        {isPending ? "Deleting..." : "Delete category"}
      </button>
    </div>,
    document.body
  );
}

function ExpenseRows({ categories, monthKey, onContextMenu }: { categories: BudgetOverviewCategory[]; monthKey: string; onContextMenu: (event: React.MouseEvent, category: BudgetOverviewCategory) => void }) {
  const orderedCategories = [...categories].sort((first, second) => Number(second.isActive) - Number(first.isActive));

  return (
    <div className="overflow-hidden rounded-lg border border-slate-100">
      <div className="grid grid-cols-[minmax(0,1.5fr)_5rem_5rem_7rem] items-center gap-3 bg-slate-50 px-3 py-2 text-[9px] font-semibold uppercase tracking-wide text-slate-500"><span>Category</span><span>Budget</span><span>Spent</span><span>Remaining</span></div>
      {orderedCategories.map((category, index) => {
        const percent = remainingPercent(category.monthlyTotal, category.monthlyBudget);
        return <div key={category.id} onContextMenu={(event) => onContextMenu(event, category)} className={`grid grid-cols-[minmax(0,1.5fr)_5rem_5rem_7rem] items-center gap-3 border-t border-slate-100 px-3 py-2.5 text-[11px] transition ${category.isActive ? "hover:bg-slate-50" : "bg-slate-50 text-slate-400"}`}><span className={`flex min-w-0 items-center gap-2 font-medium ${category.isActive ? "text-slate-800" : "text-slate-400"}`}><CategoryIcon category={category} /><span className="truncate">{category.name}</span></span><EditableBudgetAmount monthCategoryId={category.id} monthKey={monthKey} amount={category.monthlyBudget} currency={category.monthlyBudgetCurrency} disabled={!category.isActive} /><span className={category.isActive ? "text-slate-600" : "text-slate-400"}>{formatCurrency(category.monthlyTotal, category.monthlyCurrency)}</span><span className="flex items-center gap-2"><span className="h-1.5 min-w-0 flex-1 overflow-hidden rounded-full bg-slate-100"><span className={`block h-full rounded-full ${category.isActive ? progressColor(index) : "bg-slate-300"}`} style={{ width: `${Math.min(Math.max(percent, 0), 100)}%` }} /></span><span className={`w-7 text-right text-[10px] ${category.isActive ? "text-slate-600" : "text-slate-400"}`}>{percent}%</span></span></div>;
      })}
      <div className="border-t border-slate-100"><QuickAddShell kind="category" categoryType="Expense" wrapperClassName="w-full" buttonClassName="flex h-8 w-full items-center gap-2 px-3 text-[11px] font-medium text-slate-500 transition hover:bg-slate-50" buttonContent={<><span className="text-base leading-none">+</span>Add expense category</>} /></div>
    </div>
  );
}

function IncomeRows({ categories, onContextMenu }: { categories: BudgetOverviewCategory[]; onContextMenu: (event: React.MouseEvent, category: BudgetOverviewCategory) => void }) {
  const orderedCategories = [...categories].sort((first, second) => Number(second.isActive) - Number(first.isActive));

  return <div className="overflow-hidden rounded-lg border border-slate-100"><div className="grid grid-cols-[minmax(0,1fr)_5rem] items-center gap-3 bg-slate-50 px-3 py-2 text-[9px] font-semibold uppercase tracking-wide text-slate-500"><span>Category</span><span>Received</span></div>{orderedCategories.map((category) => { const received = category.monthlyTotal >= 0 ? category.monthlyTotal : Math.abs(category.monthlyTotal); return <div key={category.id} onContextMenu={(event) => onContextMenu(event, category)} className={`grid grid-cols-[minmax(0,1fr)_5rem] items-center gap-3 border-t border-slate-100 px-3 py-2.5 text-[11px] transition ${category.isActive ? "hover:bg-slate-50" : "bg-slate-50 text-slate-400"}`}><span className={`flex min-w-0 items-center gap-2 font-medium ${category.isActive ? "text-slate-800" : "text-slate-400"}`}><CategoryIcon category={category} /><span className="truncate">{category.name}</span></span><span className={category.isActive ? "font-medium text-emerald-600" : "font-medium text-slate-400"}>{formatCurrency(received, category.monthlyCurrency)}</span></div>; })}</div>;
}

export default function BudgetCategoryRows({ categories, monthKey, variant }: BudgetCategoryRowsProps) {
  const router = useRouter();
  const [contextMenu, setContextMenu] = useState<ContextMenuState | null>(null);
  const [isPending, startTransition] = useTransition();
  const selectedCategory = contextMenu ? categories.find((category) => category.id === contextMenu.categoryId) : null;

  useEffect(() => {
    if (!contextMenu) return;
    const closeMenu = () => setContextMenu(null);
    document.addEventListener("mousedown", closeMenu);
    return () => document.removeEventListener("mousedown", closeMenu);
  }, [contextMenu]);

  const openContextMenu = (event: React.MouseEvent, category: BudgetOverviewCategory) => {
    event.preventDefault();
    const menuWidth = 160;
    const menuHeight = 48;
    setContextMenu({
      categoryId: category.id,
      top: Math.min(event.clientY, window.innerHeight - menuHeight - 16),
      left: Math.min(event.clientX, window.innerWidth - menuWidth - 16),
    });
  };

  const deleteSelectedCategory = () => {
    if (!selectedCategory) return;
    const formData = new FormData();
    formData.append("id", String(selectedCategory.id));
    formData.append("monthKey", monthKey ?? "");
    startTransition(async () => {
      await archiveCategory(formData);
      setContextMenu(null);
      router.refresh();
    });
  };

  return (
    <>
      {variant === "expense" ? <ExpenseRows categories={categories} monthKey={monthKey ?? ""} onContextMenu={openContextMenu} /> : <IncomeRows categories={categories} onContextMenu={openContextMenu} />}
      {contextMenu && selectedCategory ? <BudgetCategoryContextMenu menu={contextMenu} category={selectedCategory} onDelete={deleteSelectedCategory} isPending={isPending} /> : null}
    </>
  );
}
