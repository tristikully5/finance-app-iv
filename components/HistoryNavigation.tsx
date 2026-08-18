"use client";

function ChevronIcon({ direction }: { direction: "back" | "forward" }) {
  return (
    <svg viewBox="0 0 16 16" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.7" aria-hidden="true">
      <path d={direction === "back" ? "m9.5 3.5-4 4 4 4" : "m6.5 3.5 4 4-4 4"} strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export default function HistoryNavigation() {
  return (
    <div className="flex items-center gap-1" aria-label="Page history">
      <button type="button" onClick={() => window.history.back()} className="flex h-7 w-7 items-center justify-center rounded-md text-slate-400 transition hover:bg-slate-100 hover:text-slate-900" aria-label="Go back" title="Go back">
        <ChevronIcon direction="back" />
      </button>
      <button type="button" onClick={() => window.history.forward()} className="flex h-7 w-7 items-center justify-center rounded-md text-slate-400 transition hover:bg-slate-100 hover:text-slate-900" aria-label="Go forward" title="Go forward">
        <ChevronIcon direction="forward" />
      </button>
    </div>
  );
}
