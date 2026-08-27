"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
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
const PICKER_WIDTH = 332;

type MonthCalendarPickerProps =
  | {
      mode?: "month";
      monthKey: string;
      monthLabel: string;
      todayMonthKey: string;
      className?: string;
    }
  | {
      mode: "date";
      dateValue: string;
      onDateChange: (value: string) => void;
      name?: string;
      className?: string;
    };

function parseMonthKey(value: string) {
  const [year, month] = value.split("-").map(Number);
  return { year, month };
}

function parseDateKey(value?: string) {
  const [year, month, day] = (value ?? "").split("-").map(Number);
  const today = new Date();
  return {
    year: year || today.getFullYear(),
    month: month || today.getMonth() + 1,
    day: day || today.getDate(),
  };
}

function formatDateKey(year: number, month: number, day: number) {
  return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

function buildMonthKey(year: number, month: number) {
  return `${year}-${String(month).padStart(2, "0")}`;
}

function formatDateLabel(value: string) {
  const date = new Date(`${value}T12:00:00`);
  return new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", year: "numeric" }).format(date);
}

function ChevronIcon({ direction }: { direction: "left" | "right" }) {
  return (
    <svg viewBox="0 0 16 16" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="1.7" aria-hidden="true">
      <path d={direction === "left" ? "m9.5 3.5-4.5 4.5 4.5 4.5" : "m6.5 3.5 4.5 4.5-4.5 4.5"} strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function CalendarIcon() {
  return (
    <svg viewBox="0 0 16 16" className="h-3 w-3 shrink-0" fill="none" stroke="currentColor" strokeWidth="1.4" aria-hidden="true">
      <rect x="2.5" y="3.5" width="11" height="10" rx="1.5" />
      <path d="M5 2.5v3M11 2.5v3M2.5 7h11" />
    </svg>
  );
}

export default function MonthCalendarPicker(props: MonthCalendarPickerProps) {
  const router = useRouter();
  const pickerRef = useRef<HTMLDivElement>(null);
  const popoverRef = useRef<HTMLDivElement>(null);
  const isDateMode = props.mode === "date";
  const initialMonth = isDateMode ? parseDateKey(props.dateValue) : parseMonthKey(props.monthKey);
  const [isOpen, setIsOpen] = useState(false);
  const [displayedMonth, setDisplayedMonth] = useState({ year: initialMonth.year, month: initialMonth.month });
  const [popoverPosition, setPopoverPosition] = useState({ top: 0, left: 0 });

  const updatePopoverPosition = () => {
    const trigger = pickerRef.current;
    if (!trigger) return;

    const rect = trigger.getBoundingClientRect();
    const left = Math.max(16, Math.min(rect.left, window.innerWidth - PICKER_WIDTH - 16));
    setPopoverPosition({ top: rect.bottom + 8, left });
  };

  useEffect(() => {
    if (!isOpen) return;

    const handlePointerDown = (event: PointerEvent) => {
      const target = event.target as Node;
      if (!pickerRef.current?.contains(target) && !popoverRef.current?.contains(target)) {
        setIsOpen(false);
      }
    };
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setIsOpen(false);
    };

    document.addEventListener("pointerdown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    window.addEventListener("resize", updatePopoverPosition);
    window.addEventListener("scroll", updatePopoverPosition, true);
    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("resize", updatePopoverPosition);
      window.removeEventListener("scroll", updatePopoverPosition, true);
    };
  }, [isOpen]);

  const today = new Date();
  const todayKey = formatDateKey(today.getFullYear(), today.getMonth() + 1, today.getDate());
  const selectedDateKey = isDateMode ? props.dateValue || todayKey : "";

  const calendarDays = useMemo(() => {
    const firstDay = new Date(displayedMonth.year, displayedMonth.month - 1, 1);
    const daysInMonth = new Date(displayedMonth.year, displayedMonth.month, 0).getDate();
    const leadingDays = (firstDay.getDay() + 6) % 7;
    const totalCells = Math.ceil((leadingDays + daysInMonth) / 7) * 7;

    return Array.from({ length: totalCells }, (_, index) => {
      const date = new Date(displayedMonth.year, displayedMonth.month - 1, index - leadingDays + 1);
      const dateKey = formatDateKey(date.getFullYear(), date.getMonth() + 1, date.getDate());
      return {
        dateKey,
        day: date.getDate(),
        year: date.getFullYear(),
        month: date.getMonth() + 1,
        inMonth: date.getMonth() === displayedMonth.month - 1,
        isSelected: dateKey === selectedDateKey,
      };
    });
  }, [displayedMonth, selectedDateKey]);

  const yearOptions = useMemo(() => {
    return Array.from({ length: 21 }, (_, index) => displayedMonth.year - 10 + index);
  }, [displayedMonth.year]);

  const goToMonth = (year: number, month: number) => {
    router.push(`/transactions?month=${buildMonthKey(year, month)}`);
    setIsOpen(false);
  };

  const selectDate = (year: number, month: number, day: number) => {
    if (isDateMode) {
      props.onDateChange(formatDateKey(year, month, day));
      setIsOpen(false);
      return;
    }

    goToMonth(year, month);
  };

  const moveMonth = (offset: number) => {
    const next = new Date(displayedMonth.year, displayedMonth.month - 1 + offset, 1);
    setDisplayedMonth({ year: next.getFullYear(), month: next.getMonth() + 1 });
  };

  const clear = () => {
    if (isDateMode) {
      props.onDateChange("");
    } else {
      router.push("/transactions");
    }
    setIsOpen(false);
  };

  const chooseToday = () => {
    if (isDateMode) {
      props.onDateChange(todayKey);
      setIsOpen(false);
      return;
    }

    const todayMonth = parseMonthKey(props.todayMonthKey);
    goToMonth(todayMonth.year, todayMonth.month);
  };

  const openPicker = () => {
    if (!isOpen) {
      const nextDate = isDateMode ? parseDateKey(props.dateValue) : displayedMonth;
      setDisplayedMonth({ year: nextDate.year, month: nextDate.month });
      updatePopoverPosition();
    }
    setIsOpen((current) => !current);
  };

  const triggerLabel = isDateMode ? (props.dateValue ? formatDateLabel(props.dateValue) : "Select date") : props.monthLabel;
  const triggerClassName = props.className ?? "inline-flex h-8 min-w-24 items-center justify-center gap-1.5 rounded-lg border border-slate-200 px-2 text-[11px] font-semibold text-slate-800 transition hover:bg-slate-50";

  const popover = isOpen ? (
    <div
      ref={popoverRef}
      role="dialog"
      aria-label={isDateMode ? "Choose transaction date" : "Choose transaction month"}
      className="fixed z-[70] w-[min(20.75rem,calc(100vw-2rem))] overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xl"
      style={{ top: popoverPosition.top, left: popoverPosition.left }}
    >
      <div className="flex items-center gap-1.5 px-2.5 pb-2 pt-2.5">
        <label className="relative w-24 shrink-0">
          <span className="sr-only">Month</span>
          <select
            aria-label="Month"
            value={displayedMonth.month}
            onChange={(event) => setDisplayedMonth((current) => ({ ...current, month: Number(event.target.value) }))}
            className="h-7 w-full appearance-none rounded-lg border border-slate-200 bg-white px-2 pr-6 text-[11px] font-semibold text-slate-800 outline-none focus:border-violet-400 focus:ring-2 focus:ring-violet-100"
          >
            {MONTH_NAMES.map((name, index) => <option key={name} value={index + 1}>{name}</option>)}
          </select>
          <span className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-xs text-slate-500">⌄</span>
        </label>
        <label className="relative w-[4.5rem] shrink-0">
          <span className="sr-only">Year</span>
          <select
            aria-label="Year"
            value={displayedMonth.year}
            onChange={(event) => setDisplayedMonth((current) => ({ ...current, year: Number(event.target.value) }))}
            className="h-7 w-full appearance-none rounded-lg border border-slate-200 bg-white px-2 pr-5 text-[11px] font-semibold text-slate-800 outline-none focus:border-violet-400 focus:ring-2 focus:ring-violet-100"
          >
            {yearOptions.map((year) => <option key={year} value={year}>{year}</option>)}
          </select>
          <span className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-xs text-slate-500">⌄</span>
        </label>
        <button type="button" onClick={() => moveMonth(-1)} aria-label="Previous month" className="ml-auto inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-slate-200 text-slate-600 transition hover:bg-slate-50">
          <ChevronIcon direction="left" />
        </button>
        <button type="button" onClick={() => moveMonth(1)} aria-label="Next month" className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-slate-200 text-slate-600 transition hover:bg-slate-50">
          <ChevronIcon direction="right" />
        </button>
      </div>

      <div className="px-2.5 pb-2.5">
        <div className="grid grid-cols-7 text-center text-[10px] font-medium text-slate-500">
          {WEEKDAYS.map((day) => <div key={day} className="py-1.5">{day}</div>)}
        </div>
        <div className="grid grid-cols-7 gap-y-0.5 text-center">
          {calendarDays.map(({ dateKey, day, year, month, inMonth, isSelected }) => isDateMode ? (
            <button
              key={dateKey}
              type="button"
              onClick={() => selectDate(year, month, day)}
              className={`mx-auto flex h-6 w-6 items-center justify-center rounded-lg text-[11px] transition ${!inMonth ? "text-slate-300" : isSelected ? "bg-violet-700 font-semibold text-white shadow-sm" : "text-slate-700 hover:bg-violet-50 hover:text-violet-700"}`}
              aria-label={`${MONTH_NAMES[month - 1]} ${day}, ${year}`}
            >
              {day}
            </button>
          ) : (
            <div key={dateKey} aria-hidden="true" className={`mx-auto flex h-6 w-6 items-center justify-center text-[11px] ${inMonth ? "text-slate-700" : "text-slate-300"}`}>
              {day}
            </div>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-2 border-t border-slate-200">
        <button type="button" onClick={clear} className="border-r border-slate-200 px-3 py-2.5 text-[11px] font-semibold text-violet-700 transition hover:bg-violet-50">Clear</button>
        <button type="button" onClick={chooseToday} className="px-3 py-2.5 text-[11px] font-semibold text-violet-700 transition hover:bg-violet-50">Today</button>
      </div>
    </div>
  ) : null;

  return (
    <div ref={pickerRef} className="relative">
      {isDateMode ? <input type="text" name={props.name ?? "date"} value={props.dateValue || ""} required readOnly aria-label="Selected date" className="sr-only" /> : null}
      <button type="button" onClick={openPicker} aria-expanded={isOpen} aria-haspopup="dialog" className={triggerClassName}>
        <CalendarIcon />
        {triggerLabel}
        <span aria-hidden="true" className="text-slate-400">⌄</span>
      </button>
      {typeof document !== "undefined" && popover ? createPortal(popover, document.body) : null}
    </div>
  );
}
