"use client";

import { createMonth } from "@/app/budgets/actions";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

export default function NewMonthDialog({ defaultMonth }: { defaultMonth: string }) {
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const monthKey = String(formData.get("month") ?? "");
    startTransition(async () => {
      await createMonth(formData);
      setOpen(false);
      router.push(`/budgets/${monthKey}`);
    });
  };

  return (
    <>
      <button type="button" onClick={() => setOpen(true)} className="inline-flex h-9 items-center gap-2 rounded-lg bg-slate-950 px-3.5 text-xs font-semibold text-white shadow-sm transition hover:bg-slate-800">
        <span className="text-base leading-none">+</span> New month
      </button>
      {open ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/25 p-4 backdrop-blur-[1px]" onClick={() => setOpen(false)}>
          <div className="w-full max-w-sm rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl" onClick={(event) => event.stopPropagation()}>
            <div className="mb-5 flex items-center justify-between gap-4">
              <div className="flex items-center gap-3"><span className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-50 text-blue-600">▧</span><h2 className="text-xl font-bold text-slate-950">New month</h2></div>
              <button type="button" onClick={() => setOpen(false)} className="text-xl leading-none text-slate-400 transition hover:text-slate-700" aria-label="Close dialog">×</button>
            </div>
            <form onSubmit={handleSubmit} className="space-y-4">
              <label className="transaction-dialog-field">Month<input name="month" type="month" defaultValue={defaultMonth} required /></label>
              <div className="flex justify-end pt-1"><button disabled={isPending} className="rounded-lg bg-slate-950 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:opacity-60">{isPending ? "Saving..." : "Save"}</button></div>
            </form>
          </div>
        </div>
      ) : null}
    </>
  );
}
