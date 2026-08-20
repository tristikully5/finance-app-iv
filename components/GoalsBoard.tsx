"use client";

import QuickAddShell from "@/app/components/QuickAddShell";
import { deleteGoal, updateGoal } from "@/app/goals/actions";
import IconDisplay from "@/components/IconDisplay";
import IconPicker from "@/components/IconPicker";
import PageHeader from "@/components/PageHeader";
import { defaultIconValue } from "@/lib/icon-options";
import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import AmountInput from "@/components/AmountInput";

type Goal = {
  id: number;
  name: string;
  icon: string;
  amount: number;
  currency?: string;
  targetDate?: Date | null;
  description: string | null;
  status: string;
  amountUsed: number;
  allocated?: number;
  spent?: number;
};

type GoalFilter = "All" | "Progressing" | "Completed" | "Concluded" | "On hold";
type GoalSort = "updated" | "amount" | "progress";
type GoalView = "grid" | "list";

const goalTones = ["bg-rose-50", "bg-blue-50", "bg-emerald-50", "bg-amber-50", "bg-violet-50", "bg-cyan-50", "bg-orange-50"];
const progressTones = ["bg-emerald-500", "bg-blue-500", "bg-slate-500", "bg-emerald-500", "bg-violet-500", "bg-cyan-500", "bg-orange-500"];

function formatAmount(amount: number) {
  return new Intl.NumberFormat("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(amount);
}

function progressFor(goal: Goal) {
  if (goal.amount <= 0) return 0;
  return Math.min(Math.max(Math.round((goal.amountUsed / goal.amount) * 100), 0), 100);
}

function statusLabel(status: string) {
  if (status === "Progressing") return "Progressing";
  if (status === "Concluded") return "Concluded";
  return status || "Progressing";
}

function statusClasses(status: string) {
  if (status === "Completed") return "bg-emerald-50 text-emerald-700";
  if (status === "Concluded") return "bg-rose-50 text-rose-700";
  if (status === "On hold") return "bg-slate-100 text-slate-600";
  return "bg-amber-50 text-amber-700";
}

function CalendarIcon() {
  return (
    <svg viewBox="0 0 16 16" className="h-3 w-3" fill="none" stroke="currentColor" strokeWidth="1.4" aria-hidden="true">
      <rect x="2.5" y="3.5" width="11" height="10" rx="1.5" />
      <path d="M5 2.5v3M11 2.5v3M2.5 7h11" />
    </svg>
  );
}

function GoalEditDialog({ goal, onClose }: { goal: Goal; onClose: () => void }) {
  const [isPending, startTransition] = useTransition();
  const [description, setDescription] = useState(goal.description ?? "");
  const router = useRouter();

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    startTransition(async () => {
      await updateGoal(formData);
      onClose();
      router.refresh();
    });
  };

  const handleDelete = () => {
    const formData = new FormData();
    formData.append("id", String(goal.id));
    startTransition(async () => {
      await deleteGoal(formData);
      onClose();
      router.refresh();
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/25 p-4 backdrop-blur-[1px]" onClick={onClose}>
      <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl" onClick={(event) => event.stopPropagation()}>
        <div className="mb-5 flex items-start justify-between gap-4">
          <div>
            <h2 className="text-xl font-bold text-slate-950">Edit goal</h2>
            <p className="mt-1 text-xs text-slate-500">Update the target, date, description, and progress status.</p>
          </div>
          <button type="button" onClick={onClose} className="text-xl leading-none text-slate-400 transition hover:text-slate-700" aria-label="Close edit goal dialog">×</button>
        </div>
        <form onSubmit={handleSubmit} className="space-y-5">
          <input type="hidden" name="id" value={goal.id} />
          <input type="hidden" name="amountUsed" value={goal.amountUsed} />
          <div className="flex items-start gap-3">
            <IconPicker name="icon" defaultValue={goal.icon || defaultIconValue} type="Goal" />
            <input name="name" defaultValue={goal.name} aria-label="Goal name" className="w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm text-slate-900 outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100" required />
          </div>
          <label className="grid grid-cols-[5rem_minmax(0,1fr)] items-center gap-3 text-xs font-medium text-slate-700">Date<input name="targetDate" type="date" defaultValue={goal.targetDate ? goal.targetDate.toISOString().slice(0, 10) : ""} className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100" /></label>
          <label className="grid grid-cols-[5rem_minmax(0,1fr)] items-center gap-3 text-xs font-medium text-slate-700">
            Amount
            <div className="grid grid-cols-[minmax(0,1fr)_6rem] gap-2">
              <AmountInput name="amount" defaultValue={goal.amount} required className="w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm text-slate-900 outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100" />
              <select name="currency" defaultValue={goal.currency || "SGD"} className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100">
                <option>SGD</option>
                <option>USD</option>
                <option>EUR</option>
              </select>
            </div>
          </label>
          <label className="grid grid-cols-[5rem_minmax(0,1fr)] items-center gap-3 text-xs font-medium text-slate-700">Status<select name="status" defaultValue={goal.status} className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100"><option>Progressing</option><option>Completed</option><option>Concluded</option><option>On hold</option></select></label>
          <label className="block text-xs font-medium text-slate-700">
            <span className="block">Description <span className="font-normal italic text-slate-500">(optional)</span></span>
            <textarea name="description" value={description} onChange={(event) => setDescription(event.target.value)} maxLength={200} rows={2} className="mt-2 w-full resize-none rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-900 outline-none placeholder:text-slate-400 focus:border-blue-400 focus:ring-2 focus:ring-blue-100" />
            <span className="mt-1 block text-right text-[10px] font-normal text-slate-500">{description.length} / 200</span>
          </label>
          <div className="flex items-center justify-between gap-3 pt-1">
            <button type="button" onClick={handleDelete} disabled={isPending} className="inline-flex items-center gap-2 text-sm font-semibold text-rose-600 transition hover:text-rose-700 disabled:opacity-60">
              <svg viewBox="0 0 16 16" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.7" aria-hidden="true"><path d="M3.5 5.5v7.25A1.25 1.25 0 0 0 4.75 14h6.5a1.25 1.25 0 0 0 1.25-1.25V5.5M2.5 4h11M6 4V2.5h4V4M6.5 7.25v4M9.5 7.25v4" /></svg>
              {isPending ? "Deleting..." : "Delete goal"}
            </button>
            <button disabled={isPending} className="rounded-lg bg-slate-950 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:opacity-60">{isPending ? "Saving..." : "Save changes"}</button>
          </div>
        </form>
      </div>
    </div>
  );
}

function GoalCard({ goal, index, onEdit }: { goal: Goal; index: number; onEdit: () => void }) {
  const progress = progressFor(goal);
  const router = useRouter();

  return (
    <article
      className="cursor-pointer rounded-xl border border-slate-200 bg-white p-3.5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
      onClick={() => router.push(`/goals/${goal.id}`)}
    >
      <div className="flex items-start justify-between gap-3">
        <div className={`flex h-9 w-9 items-center justify-center rounded-lg ${goalTones[index % goalTones.length]}`} aria-hidden="true"><IconDisplay icon={goal.icon} className="h-5 w-5 object-contain" /></div>
        <button
          type="button"
          onClick={(event) => {
            event.stopPropagation();
            onEdit();
          }}
          className="rounded-md px-1.5 py-0.5 text-lg leading-none text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
          aria-label={`Edit ${goal.name}`}
        >
          ⋯
        </button>
      </div>
      <h2 className="mt-3 truncate text-sm font-bold text-slate-950">{goal.name}</h2>
      <div className="mt-1.5 flex items-center justify-between gap-2">
        <span className={`rounded px-1.5 py-0.5 text-[9px] font-semibold ${statusClasses(goal.status)}`}>{statusLabel(goal.status)}</span>
        <span className="text-xs font-bold text-slate-500">{progress}%</span>
      </div>
      <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-slate-100"><div className={`h-full rounded-full ${progressTones[index % progressTones.length]}`} style={{ width: `${progress}%` }} /></div>
      <p className="mt-2 text-[10px] text-slate-500">
        <span className="font-bold text-slate-700">Alloc {goal.currency} {formatAmount(goal.allocated ?? 0)}</span>
        <span className="mx-1 text-slate-400">•</span>
        <span className="font-bold text-slate-700">Spent {goal.currency} {formatAmount(goal.spent ?? goal.amountUsed ?? 0)}</span>
      </p>
      <div className="mt-5 flex items-center gap-1.5 text-[10px] text-slate-500"><CalendarIcon />{goal.status === "Completed" || goal.status === "Concluded" ? statusLabel(goal.status) : "No target date"}</div>
    </article>
  );
}

function GoalAddCard() {
  return (
    <QuickAddShell
      kind="goal"
      wrapperClassName="h-full"
      buttonClassName="flex h-full min-h-[176px] w-full flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-slate-300 bg-white text-xs font-medium text-slate-500 transition hover:border-slate-400 hover:bg-slate-50"
      buttonContent={<><span className="flex h-9 w-9 items-center justify-center rounded-full border border-slate-300 text-2xl font-light leading-none text-slate-500">+</span><span>Add goal</span></>}
    />
  );
}

export default function GoalsBoard({ goals }: { goals: Goal[] }) {
  const [filter, setFilter] = useState<GoalFilter>("All");
  const [sort, setSort] = useState<GoalSort>("updated");
  const [view, setView] = useState<GoalView>("grid");
  const [editingGoal, setEditingGoal] = useState<Goal | null>(null);

  const filteredGoals = useMemo(() => {
    const visible = filter === "All" ? [...goals] : goals.filter((goal) => goal.status === filter);
    return visible.sort((first, second) => {
      if (sort === "amount") return second.amount - first.amount;
      if (sort === "progress") return progressFor(second) - progressFor(first);
      return second.id - first.id;
    });
  }, [filter, goals, sort]);

  return (
    <div className="space-y-4">
      <PageHeader
        breadcrumbs={[{ label: "Overview", href: "/" }, { label: "Goals" }]}
        title="Goals"
        description="Track target amounts and mark them complete when you are done."
        actions={<QuickAddShell kind="goal" buttonClassName="inline-flex h-9 items-center gap-1.5 rounded-lg bg-slate-950 px-3 text-xs font-semibold text-white transition hover:bg-slate-800" buttonContent={<><span className="text-base leading-none">+</span>Add goal</>} />}
      />

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-1 rounded-lg bg-slate-100 p-1">
          {(["All", "Progressing", "Completed", "Concluded", "On hold"] as GoalFilter[]).map((option) => (
            <button key={option} type="button" onClick={() => setFilter(option)} className={`rounded-md px-3 py-1.5 text-[10px] font-semibold transition ${filter === option ? "bg-white text-blue-700 shadow-sm" : "text-slate-500 hover:text-slate-800"}`}>{option === "Progressing" ? "In progress" : option}</button>
          ))}
        </div>
        <div className="flex items-center gap-2">
          <label className="flex h-8 items-center gap-2 rounded-lg border border-slate-200 bg-white px-2.5 text-[10px] text-slate-500">Sort:
            <select value={sort} onChange={(event) => setSort(event.target.value as GoalSort)} className="bg-transparent text-[10px] font-semibold text-slate-700 outline-none"><option value="updated">Recently updated</option><option value="amount">Amount</option><option value="progress">Progress</option></select>
          </label>
          <div className="flex rounded-lg border border-slate-200 bg-white p-0.5">
            <button type="button" onClick={() => setView("grid")} className={`flex h-7 w-7 items-center justify-center rounded-md text-sm ${view === "grid" ? "bg-blue-50 text-blue-600" : "text-slate-400"}`} aria-label="Grid view">▦</button>
            <button type="button" onClick={() => setView("list")} className={`flex h-7 w-7 items-center justify-center rounded-md text-sm ${view === "list" ? "bg-blue-50 text-blue-600" : "text-slate-400"}`} aria-label="List view">☷</button>
          </div>
        </div>
      </div>

      <div className={`grid gap-3 ${view === "grid" ? "grid-cols-1 sm:grid-cols-2 xl:grid-cols-4" : "grid-cols-1"}`}>
        {filteredGoals.length === 0 ? <div className="col-span-full rounded-xl border border-dashed border-slate-300 bg-slate-50 p-10 text-center text-sm text-slate-600">No goals in this view.</div> : filteredGoals.map((goal, index) => <GoalCard key={goal.id} goal={goal} index={index} onEdit={() => setEditingGoal(goal)} />)}
        {view === "grid" ? <GoalAddCard /> : null}
      </div>
      {editingGoal ? <GoalEditDialog goal={editingGoal} onClose={() => setEditingGoal(null)} /> : null}
    </div>
  );
}
