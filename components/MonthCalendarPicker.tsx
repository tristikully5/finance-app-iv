"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";

const MONTH_NAMES = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

const WEEKDAYS = ["Mo", "Tu", "We", "Th", "Fr", "Sa", "Su"];

type MonthCalendarPickerProps = {
  monthKey: string;
  monthLabel: string;
  todayMonthKey: string;
};

function parseMonthKey(value: string) {
  const [year, month] = value.split("-").map(Number);
  return { year, month };
}

function buildMonthKey(year: number, month: number) {
  return `${year}-${String(month).padStart(2, "0")}`;
}

function ChevronIcon({ direction }: { direction: "left" | "right" }) {
  return (
    <svg viewBox="0 0 16 16" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.7" aria-hidden="true">
      <path d={direction === "left" ? "m9.5 3.5-4.5 4.5 4.5 4.5" : "m6.5 3.5 4.5 4.5-4.5 4.5"} strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function CalendarIcon() {
  return (
    <svg viewBox="0 0 16 16" className="h-3.5 w-3.5 shrink-0" fill="none" stroke="currentColor" strokeWidth="1.4" aria-hidden="true">
      <rect x="2.5" y="3.5" width="11" height="10" rx="1.5" />
      <path d="M5 2.5v3M11 2.5v3M2.5 7h11" />
    </svg>
  );
}

export default function MonthCalendarPicker({ monthKey, monthLabel, todayMonthKey }: MonthCalendarPickerProps) {
  const router = useRouter();
  const pickerRef = useRef<HTMLDivElement>(null);
  const selectedMonth = parseMonthKey(monthKey);
  const [isOpen, setIsOpen] = useState(false);
  const [displayedMonth, setDisplayedMonth] = useState(selectedMonth);

  useEffect(() => {
    if (!isOpen) return;

    const handlePointerDown = (event: PointerEvent) => {
      if (!pickerRef.current?.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setIsOpen(false);
    };

    document.addEventListener("pointerdown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen]);

  const today = new Date();
  const todayKey = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;

  const calendarDays = useMemo(() => {
    const firstDay = new Date(displayedMonth.year, displayedMonth.month - 1, 1);
    const daysInMonth = new Date(displayedMonth.year, displayedMonth.month, 0).getDate();
    const leadingDays = (firstDay.getDay() + 6) % 7;
    const totalCells = Math.ceil((leadingDays + daysInMonth) / 7) * 7;

    return Array.from({ length: totalCells }, (_, index) => {
      const date = new Date(displayedMonth.year, displayedMonth.month - 1, index - leadingDays + 1);
      const dateKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
      return {
        dateKey,
        day: date.getDate(),
        year: date.getFullYear(),
        month: date.getMonth() + 1,
        inMonth: date.getMonth() === displayedMonth.month - 1,
        isSelected: dateKey === todayKey,
      };
    });
  }, [displayedMonth, todayKey]);

  const yearOptions = useMemo(() => {
    return Array.from({ length: 21 }, (_, index) => displayedMonth.year - 10 + index);
  }, [displayedMonth.year]);

  const goToMonth = (year: number, month: number) => {
    router.push(`/transactions?month=${buildMonthKey(year, month)}`);
    setIsOpen(false);
  };

  const moveMonth = (offset: number) => {
    const next = new Date(displayedMonth.year, displayedMonth.month - 1 + offset, 1);
    setDisplayedMonth({ year: next.getFullYear(), month: next.getMonth() + 1 });
  };

  const clearMonth = () => {
    router.push("/transactions");
    setIsOpen(false);
  };

  return (
    <div ref={pickerRef} className="relative">
      <button
        type="button"
        onClick={() => setIsOpen((current) => !current)}
        aria-expanded={isOpen}
        aria-haspopup="dialog"
        className="inline-flex h-9 min-w-32 items-center justify-center gap-2 rounded-lg border border-slate-200 px-3 text-xs font-semibold text-slate-800 transition hover:bg-slate-50"
      >
        <CalendarIcon />
        {monthLabel}
        <span aria-hidden="true" className="text-slate-400">⌄</span>
      </button>

      {isOpen ? (
        <div role="dialog" aria-label="Choose transaction month" className="absolute left-0 top-[calc(100%+0.5rem)] z-30 w-[min(31rem,calc(100vw-2rem))] overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xl">
          <div className="flex items-center gap-2 px-4 pb-3 pt-4">
            <label className="relative w-36 shrink-0">
              <span className="sr-only">Month</span>
              <select
                aria-label="Month"
                value={displayedMonth.month}
                onChange={(event) => setDisplayedMonth((current) => ({ ...current, month: Number(event.target.value) }))}
                className="h-10 w-full appearance-none rounded-xl border border-slate-200 bg-white px-3 pr-8 text-sm font-semibold text-slate-800 outline-none focus:border-violet-400 focus:ring-2 focus:ring-violet-100"
              >
                {MONTH_NAMES.map((name, index) => <option key={name} value={index + 1}>{name}</option>)}
              </select>
              <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-slate-500">⌄</span>
            </label>
            <label className="relative w-28 shrink-0">
              <span className="sr-only">Year</span>
              <select
                aria-label="Year"
                value={displayedMonth.year}
                onChange={(event) => setDisplayedMonth((current) => ({ ...current, year: Number(event.target.value) }))}
                className="h-10 w-full appearance-none rounded-xl border border-slate-200 bg-white px-3 pr-7 text-sm font-semibold text-slate-800 outline-none focus:border-violet-400 focus:ring-2 focus:ring-violet-100"
              >
                {yearOptions.map((year) => <option key={year} value={year}>{year}</option>)}
              </select>
              <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-slate-500">⌄</span>
            </label>
            <button type="button" onClick={() => moveMonth(-1)} aria-label="Previous month" className="ml-auto inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-slate-200 text-slate-600 transition hover:bg-slate-50">
              <ChevronIcon direction="left" />
            </button>
            <button type="button" onClick={() => moveMonth(1)} aria-label="Next month" className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-slate-200 text-slate-600 transition hover:bg-slate-50">
              <ChevronIcon direction="right" />
            </button>
          </div>

          <div className="px-4 pb-4">
            <div className="grid grid-cols-7 text-center text-xs font-medium text-slate-500">
              {WEEKDAYS.map((day) => <div key={day} className="py-2">{day}</div>)}
            </div>
            <div className="grid grid-cols-7 gap-y-1 text-center">
              {calendarDays.map(({ dateKey, day, year, month, inMonth, isSelected }) => (
                <button
                  key={dateKey}
                  type="button"
                  onClick={() => goToMonth(year, month)}
                  className={`mx-auto flex h-9 w-9 items-center justify-center rounded-xl text-sm transition ${!inMonth ? "text-slate-300" : isSelected ? "bg-violet-700 font-semibold text-white shadow-sm" : "text-slate-700 hover:bg-violet-50 hover:text-violet-700"}`}
                  aria-label={`${MONTH_NAMES[month - 1]} ${day}, ${year}`}
                >
                  {day}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 border-t border-slate-200">
            <button type="button" onClick={clearMonth} className="border-r border-slate-200 px-4 py-4 text-sm font-semibold text-violet-700 transition hover:bg-violet-50">Clear</button>
            <button type="button" onClick={() => { const today = parseMonthKey(todayMonthKey); goToMonth(today.year, today.month); }} className="px-4 py-4 text-sm font-semibold text-violet-700 transition hover:bg-violet-50">Today</button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
